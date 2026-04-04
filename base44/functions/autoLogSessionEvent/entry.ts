import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      campaign_id,
      entry_type,
      user_id,
      user_name,
      character_id,
      character_name,
      content,
      metadata,
      visibility = 'public'
    } = body;

    if (!campaign_id || !entry_type || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const logEntry = await base44.entities.SessionLog.create({
      campaign_id,
      entry_type,
      user_id,
      user_name,
      character_id,
      character_name,
      content,
      metadata: metadata || {},
      visibility
    });

    return Response.json({ success: true, logEntry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});