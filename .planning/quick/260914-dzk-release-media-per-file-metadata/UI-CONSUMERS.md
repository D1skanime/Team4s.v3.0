# Upload-UI-Consumerprüfung

ReleaseVersionMediaSection wird im Member-Release-Workspace und Admin EpisodeVersionEditorPage eingebettet. Die bisherige doppelte Thumbnail-/Queue-Darstellung besitzt keine weiteren Consumer. Extraktion als ReleaseVersionMediaUploadQueue hält den bestehenden fachlichen Hook als einzigen Uploadbesitzer und bündelt Darstellung/Blob-Preview-Cleanup pro Datei. Bestehende Input/Textarea/FormField/Button wiederverwenden; kein globales Progressbar-Primitive vorhanden, deshalb native progress.

Styles localPreviewGrid/localPreviewCard/localPreviewCaption/queueRow/queueMeta nur in der Section benutzt; durch die neue einzige Liste ersetzt. Thumbnail-Styles weiterverwenden. Neue Listenkomposition durch Containerquery ab 32rem statt Geräte-Mediaquery. Bestehende übrige Medien-/Drawer-Styles nicht umgestalten.

Helper buildSelectedItemSavePayload und buildReplaceMediaFileRequest erhalten title additiv. Das aktuelle Medium-Bearbeiten-Drawer braucht Titel und Beschreibung getrennt, inklusive readonly/rejected/file-replace. Öffentliche Consumer werden separat in FRONTEND-CONSUMERS.md dokumentiert. Alte separate MediaGallery/DetailPanel haben keine Runtime-Caller und werden nicht reaktiviert.
