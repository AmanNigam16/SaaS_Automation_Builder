const encodeHeader = (value: string) => {
  if (/\r|\n/.test(value)) throw new Error('Email headers cannot contain line breaks')
  if (/^[\x20-\x7E]*$/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

export const createRawEmail = ({
  to,
  cc,
  bcc,
  subject,
  body,
}: {
  to: string
  cc?: string
  bcc?: string
  subject: string
  body: string
}) => {
  const lines = [
    `To: ${encodeHeader(to)}`,
    ...(cc ? [`Cc: ${encodeHeader(cc)}`] : []),
    ...(bcc ? [`Bcc: ${encodeHeader(bcc)}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64'),
  ]
  return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url')
}
