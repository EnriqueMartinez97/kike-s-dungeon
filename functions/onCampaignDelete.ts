import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return Response.json({ error: 'campaign_id required' }, { status: 400 });
    }

    // Unlink all documents from this campaign
    const docs = await base44.asServiceRole.entities.Document.filter({ campaign_id });
    await Promise.all(docs.map(async (doc) => {
      const newIds = (doc.campaign_ids || []).filter(id => id !== campaign_id);
      await base44.asServiceRole.entities.Document.update(doc.id, {
        campaign_id: doc.campaign_id === campaign_id ? null : doc.campaign_id,
        campaign_ids: newIds
      });
    }));

    // Unlink all NPCs from this campaign
    const npcs = await base44.asServiceRole.entities.NPC.filter({ campaign_id });
    await Promise.all(npcs.map(async (npc) => {
      const newIds = (npc.campaign_ids || []).filter(id => id !== campaign_id);
      await base44.asServiceRole.entities.NPC.update(npc.id, {
        campaign_id: npc.campaign_id === campaign_id ? null : npc.campaign_id,
        campaign_ids: newIds
      });
    }));

    // Unlink all characters from this campaign
    const chars = await base44.asServiceRole.entities.Character.filter({ campaign_id });
    await Promise.all(chars.map(async (char) => {
      const newIds = (char.campaign_ids || []).filter(id => id !== campaign_id);
      await base44.asServiceRole.entities.Character.update(char.id, {
        campaign_id: char.campaign_id === campaign_id ? null : char.campaign_id,
        campaign_ids: newIds,
        level: 1,
        xp: 0
      });
    }));

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});