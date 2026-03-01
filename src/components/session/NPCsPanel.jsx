import React, { useState } from 'react';
import { Swords, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function NPCsPanel({ npcs }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <Card className="bg-slate-900/50 border-slate-800 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-400" />
          NPCs ({npcs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1 overflow-y-auto max-h-[calc(100%-56px)]">
        {npcs.length === 0 ? (
          <p className="text-xs text-slate-500 px-2">No NPCs in campaign.</p>
        ) : (
          npcs.map(npc => {
            const isExpanded = expanded[npc.id];
            return (
              <div key={npc.id} className="rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => toggle(npc.id)}>
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={npc.portrait_url} />
                    <AvatarFallback className="bg-red-800 text-white text-xs">{npc.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{npc.name}</p>
                    {npc.faction && <p className="text-xs text-slate-500 truncate">{npc.faction}</p>}
                  </div>
                  {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-500 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-700/50 pt-2 space-y-1">
                    {npc.description && <p className="text-xs text-slate-400">{npc.description}</p>}
                    {npc.location && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Location</span><span className="text-white">{npc.location}</span>
                      </div>
                    )}
                    {npc.stat_block && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {npc.stat_block.hp && <Badge className="text-xs bg-red-500/10 text-red-300 border border-red-500/20">HP {npc.stat_block.hp}</Badge>}
                        {npc.stat_block.ac && <Badge className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20">AC {npc.stat_block.ac}</Badge>}
                        {npc.stat_block.cr && <Badge className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">CR {npc.stat_block.cr}</Badge>}
                      </div>
                    )}
                    {npc.notes && <p className="text-xs text-slate-500 italic mt-1">{npc.notes}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}