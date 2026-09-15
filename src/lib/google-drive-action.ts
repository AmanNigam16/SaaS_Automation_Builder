import { Readable } from 'node:stream'
import { google } from 'googleapis'
import { getGoogleWorkspaceClient } from '@/lib/google-drive'
import { resolveExpression, type WorkflowContext, type WorkflowNodeConfig, type WorkflowValue } from '@/lib/workflow-semantics'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const REQUEST_TIMEOUT_MS = 15_000
const MAX_FILE_BYTES = 5 * 1024 * 1024

const resolveText = (value: string | undefined, context: WorkflowContext, label: string) => {
  const resolved = String(resolveExpression(value ?? '', context)).trim()
  if (!resolved) throw new Error(`${label} is required`)
  return resolved
}

const fileOutput = (file: { id?: string | null; name?: string | null; mimeType?: string | null; webViewLink?: string | null }) => ({
  fileId: file.id ?? null,
  fileName: file.name ?? null,
  mimeType: file.mimeType ?? null,
  webViewLink: file.webViewLink ?? null,
  contentBase64: null,
  deleted: false,
})

export const executeGoogleDriveAction = async (
  clerkUserId: string,
  config: WorkflowNodeConfig,
  context: WorkflowContext
): Promise<Record<string, WorkflowValue>> => {
  const auth = await getGoogleWorkspaceClient(clerkUserId, [DRIVE_SCOPE])
  const drive = google.drive({ version: 'v3', auth })
  const operation = config.operation ?? 'drive_metadata'

  if (operation === 'drive_upload') {
    const content = resolveText(config.uploadContent, context, 'File content')
    const buffer = config.uploadEncoding === 'base64'
      ? Buffer.from(content, 'base64')
      : Buffer.from(content, 'utf8')
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error('Upload must be between 1 byte and 5 MB')
    const response = await drive.files.create({
      requestBody: {
        name: resolveText(config.uploadName, context, 'File name'),
        parents: config.parentFolderId ? [resolveText(config.parentFolderId, context, 'Parent folder ID')] : undefined,
      },
      media: { mimeType: config.uploadMimeType?.trim() || 'text/plain', body: Readable.from(buffer) },
      fields: 'id,name,mimeType,webViewLink',
    }, { timeout: REQUEST_TIMEOUT_MS })
    return fileOutput(response.data)
  }

  const fileId = resolveText(config.fileId, context, 'File ID')
  if (operation === 'drive_move') {
    const current = await drive.files.get({ fileId, fields: 'parents' }, { timeout: REQUEST_TIMEOUT_MS })
    const response = await drive.files.update({
      fileId,
      addParents: resolveText(config.parentFolderId, context, 'Destination folder ID'),
      removeParents: current.data.parents?.join(','),
      fields: 'id,name,mimeType,webViewLink',
    }, { timeout: REQUEST_TIMEOUT_MS })
    return fileOutput(response.data)
  }
  if (operation === 'drive_rename') {
    const response = await drive.files.update({ fileId, requestBody: { name: resolveText(config.newName, context, 'New file name') }, fields: 'id,name,mimeType,webViewLink' }, { timeout: REQUEST_TIMEOUT_MS })
    return fileOutput(response.data)
  }
  if (operation === 'drive_copy') {
    const response = await drive.files.copy({ fileId, requestBody: { name: config.copyName ? resolveText(config.copyName, context, 'Copy name') : undefined, parents: config.parentFolderId ? [resolveText(config.parentFolderId, context, 'Destination folder ID')] : undefined }, fields: 'id,name,mimeType,webViewLink' }, { timeout: REQUEST_TIMEOUT_MS })
    return fileOutput(response.data)
  }
  if (operation === 'drive_share') {
    await drive.permissions.create({ fileId, sendNotificationEmail: true, requestBody: { type: 'user', role: config.permissionRole ?? 'reader', emailAddress: resolveText(config.permissionEmail, context, 'Recipient email') } }, { timeout: REQUEST_TIMEOUT_MS })
    const response = await drive.files.get({ fileId, fields: 'id,name,mimeType,webViewLink' }, { timeout: REQUEST_TIMEOUT_MS })
    return fileOutput(response.data)
  }
  if (operation === 'drive_download') {
    const metadata = await drive.files.get({ fileId, fields: 'id,name,mimeType,webViewLink,size' }, { timeout: REQUEST_TIMEOUT_MS })
    if (Number(metadata.data.size ?? 0) > MAX_FILE_BYTES) throw new Error('Drive download is limited to 5 MB')
    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer', timeout: REQUEST_TIMEOUT_MS })
    const buffer = Buffer.from(response.data as ArrayBuffer)
    if (buffer.length > MAX_FILE_BYTES) throw new Error('Drive download is limited to 5 MB')
    return { ...fileOutput(metadata.data), contentBase64: buffer.toString('base64') }
  }
  const response = await drive.files.get({ fileId, fields: 'id,name,mimeType,webViewLink' }, { timeout: REQUEST_TIMEOUT_MS })
  return fileOutput(response.data)
}
