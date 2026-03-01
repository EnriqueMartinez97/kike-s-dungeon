import React, { useState } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const DICE_TYPES = [
  { sides: 4, label: 'd4', color: 'bg-red-500' },
  { sides: 6, label: 'd6', color: 'bg-orange-500' },
  { sides: 8, label: 'd8', color: 'bg-amber-500' },
  { sides: 10, label: 'd10', color: 'bg-emerald-500' },
  { sides: 12, label: 'd12', color: 'bg-blue-500' },
  { sides: 20, label: 'd20', color: 'bg-violet-500' },
  { sides: 100, label: 'd100', color: 'bg-pink-500' }
];

export default function DiceRoller({ onRoll, userName }) {
  const [customFormula, setCustomFormula] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState(null);

  const rollDice = (sides, count = 1) => {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return rolls;
  };

  const parseFormula = (formula) => {
    // Parse formulas like "2d6+3", "1d20", "3d8-2", "d20+5"
    const regex = /(\d*)d(\d+)([+-]\d+)?/gi;
    const matches = [...formula.matchAll(regex)];
    
    if (matches.length === 0) return null;

    let total = 0;
    let details = [];

    for (const match of matches) {
      const count = parseInt(match[1]) || 1;
      const sides = parseInt(match[2]);
      const modifier = parseInt(match[3]) || 0;
      
      const rolls = rollDice(sides, count);
      const sum = rolls.reduce((a, b) => a + b, 0) + modifier;
      
      total += sum;
      details.push({
        formula: `${count}d${sides}${modifier > 0 ? '+' + modifier : modifier < 0 ? modifier : ''}`,
        rolls,
        modifier,
        sum
      });
    }

    return { total, details };
  };

  const handleQuickRoll = async (sides) => {
    setRolling(true);
    
    // Animate
    await new Promise(r => setTimeout(r, 300));
    
    const rolls = rollDice(sides, 1);
    const result = {
      formula: `1d${sides}`,
      result: rolls[0],
      details: `[${rolls[0]}]`,
      timestamp: new Date().toISOString(),
      is_public: isPublic,
      user_name: userName
    };

    setLastRoll(result);
    setRolling(false);

    if (onRoll) {
      onRoll(result);
    }
  };

  const handleCustomRoll = async () => {
    if (!customFormula.trim()) return;

    setRolling(true);
    await new Promise(r => setTimeout(r, 300));

    const parsed = parseFormula(customFormula);
    if (!parsed) {
      setRolling(false);
      return;
    }

    const detailsStr = parsed.details.map(d => 
      `${d.formula}: [${d.rolls.join(', ')}]${d.modifier ? ` ${d.modifier > 0 ? '+' : ''}${d.modifier}` : ''} = ${d.sum}`
    ).join('; ');

    const result = {
      formula: customFormula,
      result: parsed.total,
      details: detailsStr,
      timestamp: new Date().toISOString(),
      is_public: isPublic,
      user_name: userName
    };

    setLastRoll(result);
    setRolling(false);

    if (onRoll) {
      onRoll(result);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Dices className="h-5 w-5 text-violet-400" />
          Dice Roller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Roll Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DICE_TYPES.map((die) => (
            <Button
              key={die.sides}
              variant="outline"
              onClick={() => handleQuickRoll(die.sides)}
              disabled={rolling}
              className={`border-slate-700 hover:border-slate-600 text-white font-bold transition-all ${
                rolling ? 'animate-pulse' : ''
              }`}
            >
              {die.label}
            </Button>
          ))}
        </div>

        {/* Custom Formula */}
        <div className="flex gap-2">
          <Input
            placeholder="Custom formula (e.g., 2d6+3)"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomRoll()}
            className="bg-slate-800 border-slate-700 text-white"
          />
          <Button
            onClick={handleCustomRoll}
            disabled={rolling || !customFormula.trim()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            Roll
          </Button>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Eye className="h-4 w-4 text-emerald-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-400" />
            )}
            <Label htmlFor="public-roll" className="text-sm text-slate-400">
              {isPublic ? 'Public roll (visible to all)' : 'Private roll (only you)'}
            </Label>
          </div>
          <Switch
            id="public-roll"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        {/* Last Roll Result */}
        {lastRoll && (
          <div className={`p-4 rounded-xl border ${
            lastRoll.result === 20 ? 'bg-emerald-500/10 border-emerald-500/30' :
            lastRoll.result === 1 ? 'bg-red-500/10 border-red-500/30' :
            'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                {lastRoll.formula}
              </Badge>
              {!lastRoll.is_public && (
                <Badge className="bg-slate-700 text-slate-300">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
            </div>
            <div className="text-center">
              <p className={`text-4xl font-bold ${
                lastRoll.result === 20 ? 'text-emerald-400' :
                lastRoll.result === 1 ? 'text-red-400' :
                'text-white'
              }`}>
                {lastRoll.result}
              </p>
              {lastRoll.result === 20 && (
                <p className="text-emerald-400 text-sm font-medium mt-1">Natural 20! 🎉</p>
              )}
              {lastRoll.result === 1 && (
                <p className="text-red-400 text-sm font-medium mt-1">Critical Fail! 💀</p>
              )}
              <p className="text-sm text-slate-500 mt-2">{lastRoll.details}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}