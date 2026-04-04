import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return Response.json({ error: 'campaign_id required' }, { status: 400 });
    }

    // Unlink documents (shared resources — just remove campaign association)
    const docs = await base44.asServiceRole.entities.Document.filter({ campaign_id });
    await Promise.all(docs.map(doc =>
      base44.asServiceRole.entities.Document.update(doc.id, {
        campaign_id: doc.campaign_id === campaign_id ? null : doc.campaign_id,
        campaign_ids: (doc.campaign_ids || []).filter(id => id !== campaign_id)
      })
    ));

    // Unlink NPCs (shared resources)
    const npcs = await base44.asServiceRole.entities.NPC.filter({ campaign_id });
    await Promise.all(npcs.map(npc =>
      base44.asServiceRole.entities.NPC.update(npc.id, {
        campaign_id: npc.campaign_id === campaign_id ? null : npc.campaign_id,
        campaign_ids: (npc.campaign_ids || []).filter(id => id !== campaign_id)
      })
    ));

    // Unlink characters (shared resources)
    const chars = await base44.asServiceRole.entities.Character.filter({ campaign_id });
    await Promise.all(chars.map(char =>
      base44.asServiceRole.entities.Character.update(char.id, {
        campaign_id: char.campaign_id === campaign_id ? null : char.campaign_id,
        campaign_ids: (char.campaign_ids || []).filter(id => id !== campaign_id)
      })
    ));

    // Delete campaign-specific entities
    const [sessionLogs, activeSessions, notes, combatInitiatives] = await Promise.all([
      base44.asServiceRole.entities.SessionLog.filter({ campaign_id }),
      base44.asServiceRole.entities.ActiveSession.filter({ campaign_id }),
      base44.asServiceRole.entities.Note.filter({ campaign_id }),
      base44.asServiceRole.entities.CombatInitiative.filter({ campaign_id }),
    ]);

    await Promise.all([
      ...sessionLogs.map(r => base44.asServiceRole.entities.SessionLog.delete(r.id)),
      ...activeSessions.map(r => base44.asServiceRole.entities.ActiveSession.delete(r.id)),
      ...notes.map(r => base44.asServiceRole.entities.Note.delete(r.id)),
      ...combatInitiatives.map(r => base44.asServiceRole.entities.CombatInitiative.delete(r.id)),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});