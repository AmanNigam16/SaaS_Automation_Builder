import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { getCallbackUrl } from '@/lib/app-url';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const encoded = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_API_SECRET}`
  ).toString('base64');
  if (code) {
    const response = await axios('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        Authorization: `Basic ${encoded}`,
        'Notion-Version': '2022-06-28',
      },
      data: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: getCallbackUrl('/api/auth/callback/notion', req.nextUrl.origin),
      }),
    });
    if (response) {
      const notion = new Client({
        auth: response.data.access_token,
      });
      const databasesPages = await notion.search({
        filter: {
          value: 'database',
          property: 'object',
        },
        sort: {
          direction: 'ascending',
          timestamp: 'last_edited_time',
        },
      });
      const databaseId = databasesPages?.results?.length
        ? databasesPages.results[0].id
        : '';

      const redirectUrl = new URL('/connections', req.nextUrl.origin);
      redirectUrl.searchParams.set('access_token', response.data.access_token);
      redirectUrl.searchParams.set('workspace_name', response.data.workspace_name);
      redirectUrl.searchParams.set('workspace_icon', response.data.workspace_icon ?? '');
      redirectUrl.searchParams.set('workspace_id', response.data.workspace_id);
      redirectUrl.searchParams.set('database_id', databaseId);

      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL('/connections', req.nextUrl.origin));
}
