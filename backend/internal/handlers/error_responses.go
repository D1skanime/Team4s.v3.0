package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

func writeInternalErrorResponse(c *gin.Context, message string, err error, operationDetails string) {
	errorBody := gin.H{
		"message": message,
	}

	if code, details := classifyInternalError(err, operationDetails); code != "" {
		errorBody["code"] = code
		if strings.TrimSpace(details) != "" {
			errorBody["details"] = details
		}
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": errorBody})
}

func classifyInternalError(err error, operationDetails string) (string, string) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "42703":
			details := "Datenbank-Schema passt nicht zur laufenden Backend-Version."
			if strings.TrimSpace(pgErr.ColumnName) != "" {
				details += " Fehlende Spalte: " + pgErr.ColumnName + "."
			}
			if strings.TrimSpace(operationDetails) != "" {
				details += " " + strings.TrimSpace(operationDetails)
			}
			return "db_schema_mismatch", details
		case "42P01":
			details := "Datenbank-Schema ist unvollstaendig oder Tabelle fehlt."
			if strings.TrimSpace(pgErr.TableName) != "" {
				details += " Fehlende Tabelle: " + pgErr.TableName + "."
			}
			if strings.TrimSpace(operationDetails) != "" {
				details += " " + strings.TrimSpace(operationDetails)
			}
			return "db_schema_mismatch", details
		}
	}

	if strings.TrimSpace(operationDetails) != "" {
		return "internal_error", strings.TrimSpace(operationDetails)
	}

	return "internal_error", ""
}
