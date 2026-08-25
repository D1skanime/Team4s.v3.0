package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"github.com/gin-gonic/gin"
)

type reviewDelegationPermissionService interface { CanForFansubGroup(context.Context, permissions.Actor, permissions.Action, int64) (permissions.Result, error) }
type reviewDelegationMutationService interface { GrantDelegation(context.Context, services.ReviewDelegationCommand) error; RevokeDelegation(context.Context, services.ReviewDelegationCommand) error }
type reviewDelegationTargetRepo interface { LockTargetMembership(context.Context, int64, int64) (*repository.TargetMembership, error) }
type reviewDelegationReadRepo interface { LoadDelegationSnapshot(context.Context, int64) (*repository.ReviewDelegationSnapshot, error) }

var reviewDelegationActionOrder = []permissions.Action{permissions.ActionReviewImageDecide, permissions.ActionReviewTextDecide, permissions.ActionReviewContributionDecide}

type AdminReviewDelegationHandler struct { permissionSvc reviewDelegationPermissionService; mutationSvc reviewDelegationMutationService; targetRepo reviewDelegationTargetRepo; readRepo reviewDelegationReadRepo; auditLogRepo auditLogWriter }
func NewAdminReviewDelegationHandler(p reviewDelegationPermissionService, m reviewDelegationMutationService, t reviewDelegationTargetRepo, r reviewDelegationReadRepo, a auditLogWriter) *AdminReviewDelegationHandler { return &AdminReviewDelegationHandler{p,m,t,r,a} }

func (h *AdminReviewDelegationHandler) path(c *gin.Context) (int64,int64,bool) {
	group, err := parseFansubID(c.Param("id")); if err != nil { badRequest(c,"ungültige fansub id"); return 0,0,false }
	target, err := strconv.ParseInt(c.Param("appUserId"),10,64); if err != nil || target <= 0 { badRequest(c,"ungültige app_user_id"); return 0,0,false }
	return group,target,true
}
func (h *AdminReviewDelegationHandler) membership(c *gin.Context,target,group int64) (*repository.TargetMembership,bool) {
	m,err:=h.targetRepo.LockTargetMembership(c.Request.Context(),target,group)
	if errors.Is(err,repository.ErrNotFound) { c.JSON(http.StatusNotFound,gin.H{"error":gin.H{"message":"mitgliedschaftseintrag nicht gefunden"}}); return nil,false }
	if err != nil { internalError(c,"interner serverfehler"); return nil,false }; return m,true
}
func (h *AdminReviewDelegationHandler) authorize(c *gin.Context, identity middleware.AuthIdentity, actor permissions.Actor, group,target int64, event string) bool {
	result,err:=h.permissionSvc.CanForFansubGroup(c.Request.Context(),actor,permissions.ActionFansubGroupMembersManage,group)
	if err != nil { writePermissionInternalError(c,err,"Berechtigung konnte nicht geprüft werden."); return false }
	if !result.Allowed { auditPermissionDenied(c,h.auditLogRepo,identity,event,&group,"review_delegation",&target,permissions.ActionFansubGroupMembersManage,result); writePermissionDenied(c,result); return false }; return true
}
func (h *AdminReviewDelegationHandler) GetReviewDelegations(c *gin.Context) {
	identity,actor,ok:=permissionActorFromContext(c); if !ok{return}; group,target,ok:=h.path(c); if !ok||!h.authorize(c,identity,actor,group,target,"review_delegation.inspect.denied"){return}; member,ok:=h.membership(c,target,group); if !ok{return}
	snapshot,err:=h.readRepo.LoadDelegationSnapshot(c.Request.Context(),member.MembershipID); if err != nil { log.Printf("review delegation snapshot: %v",err); internalError(c,"interner serverfehler"); return }; c.JSON(http.StatusOK,gin.H{"data":reviewDelegationRows(snapshot)})
}
func (h *AdminReviewDelegationHandler) MutateReviewDelegation(c *gin.Context) {
	identity,actor,ok:=permissionActorFromContext(c); if !ok{return}; group,target,ok:=h.path(c); if !ok{return}; var req ReviewDelegationMutationRequest
	if c.ShouldBindJSON(&req)!=nil { badRequest(c,"ungültiger request body"); return }; req.ActionCode=strings.TrimSpace(req.ActionCode); if req.ActionCode==""||req.Grant==nil { badRequest(c,"action_code und grant sind erforderlich"); return }; action:=permissions.Action(req.ActionCode); if !isReviewDelegationAction(action){badRequest(c,"action_code ist keine delegierbare review-aktion");return}
	member,ok:=h.membership(c,target,group); if !ok{return}; cmd:=services.ReviewDelegationCommand{Actor:actor,TargetMembershipID:member.MembershipID,Action:action}; var err error; if *req.Grant {err=h.mutationSvc.GrantDelegation(c.Request.Context(),cmd)} else {err=h.mutationSvc.RevokeDelegation(c.Request.Context(),cmd)}
	if err!=nil { switch {case errors.Is(err,services.ErrReviewCapabilityDenied): auditPermissionDenied(c,h.auditLogRepo,identity,"review_delegation.mutate.denied",&group,"review_delegation",&target,action,permissions.Result{Allowed:false,ReasonCode:permissions.ReasonInsufficientRole}); c.JSON(http.StatusForbidden,gin.H{"error":gin.H{"message":"keine berechtigung für diese aktion"}}); case errors.Is(err,services.ErrReviewDelegationTargetIneligible): auditMutationRejected(c,h.auditLogRepo,identity,"review_delegation.mutate.rejected",&group,"review_delegation",&target,action,"target_ineligible"); c.JSON(http.StatusUnprocessableEntity,gin.H{"error":gin.H{"message":"zielmitglied ist nicht berechtigungsfähig für eine delegation"}}); case errors.Is(err,services.ErrReviewActionInvalid): badRequest(c,"action_code ist keine delegierbare review-aktion"); default: internalError(c,"interner serverfehler")}; return }
	c.JSON(http.StatusOK,gin.H{"data":ReviewDelegationMutationResult{ActionCode:req.ActionCode,Granted:*req.Grant}})
}
func isReviewDelegationAction(action permissions.Action) bool { for _,candidate:=range reviewDelegationActionOrder {if action==candidate{return true}};return false }
func reviewDelegationRows(s *repository.ReviewDelegationSnapshot) []ReviewDelegationRow { granted:=map[string]bool{};for _,code:=range s.GrantedActionCodes{granted[code]=true};membershipActive:=strings.TrimSpace(s.MembershipStatus)=="active"; appUserActive:=strings.TrimSpace(s.AppUserStatus)=="active"; eligible:=membershipActive&&appUserActive&&s.HasVerifiedMemberClaim&&s.MemberID!=nil&&*s.MemberID>0;rows:=make([]ReviewDelegationRow,0,len(reviewDelegationActionOrder));for _,action:=range reviewDelegationActionOrder{rows=append(rows,ReviewDelegationRow{ActionCode:string(action),Granted:granted[string(action)],MembershipActive:membershipActive,AppUserActive:appUserActive,HasVerifiedClaim:s.HasVerifiedMemberClaim,EligibleForGrant:eligible})};return rows }
