import { base44 } from '@/api/base44Client';

/**
 * Log a roll event to the session log
 */
export const logRoll = async (campaignId, userId, userName, formula, result, details) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'ROLL',
      user_id: userId,
      user_name: userName,
      content: `${userName} rolled ${formula}`,
      metadata: {
        roll_formula: formula,
        roll_result: result,
        details: details
      },
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log roll:', error);
  }
};

/**
 * Log a damage event to the session log
 */
export const logDamage = async (campaignId, userId, userName, characterId, characterName, targetId, targetName, amount, damageType) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'DAMAGE',
      user_id: userId,
      user_name: userName,
      character_id: characterId,
      character_name: characterName,
      content: `${characterName} dealt ${amount} ${damageType} damage to ${targetName}`,
      metadata: {
        damage_amount: amount,
        damage_type: damageType,
        target_id: targetId,
        target_name: targetName
      },
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log damage:', error);
  }
};

/**
 * Log a heal event to the session log
 */
export const logHeal = async (campaignId, userId, userName, characterId, characterName, targetId, targetName, amount) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'HEAL',
      user_id: userId,
      user_name: userName,
      character_id: characterId,
      character_name: characterName,
      content: `${characterName} healed ${targetName} for ${amount} HP`,
      metadata: {
        damage_amount: amount,
        target_id: targetId,
        target_name: targetName
      },
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log heal:', error);
  }
};

/**
 * Log a status change event to the session log
 */
export const logStatusChange = async (campaignId, userId, userName, characterId, characterName, fieldChanged, beforeValue, afterValue) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'STATUS_CHANGE',
      user_id: userId,
      user_name: userName,
      character_id: characterId,
      character_name: characterName,
      content: `${characterName} changed ${fieldChanged} from ${beforeValue} to ${afterValue}`,
      metadata: {
        field_changed: fieldChanged,
        before_value: beforeValue,
        after_value: afterValue
      },
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log status change:', error);
  }
};

/**
 * Log combat start
 */
export const logCombatStart = async (campaignId) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'COMBAT_START',
      user_id: null,
      user_name: 'System',
      content: 'Combat started!',
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log combat start:', error);
  }
};

/**
 * Log combat end
 */
export const logCombatEnd = async (campaignId) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'COMBAT_END',
      user_id: null,
      user_name: 'System',
      content: 'Combat ended!',
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log combat end:', error);
  }
};

/**
 * Log quest creation
 */
export const logQuestCreation = async (campaignId, userId, userName, questTitle, questId) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'DM_MESSAGE',
      user_id: userId,
      user_name: userName,
      content: `New quest created: ${questTitle}`,
      metadata: {
        quest_id: questId,
        quest_title: questTitle
      },
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log quest creation:', error);
  }
};

/**
 * Log quest update
 */
export const logQuestUpdate = async (campaignId, userId, userName, questTitle, updateType, details) => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'DM_MESSAGE',
      user_id: userId,
      user_name: userName,
      content: `Quest "${questTitle}" ${updateType}: ${details}`,
      visibility: 'public'
    });
  } catch (error) {
    console.error('Failed to log quest update:', error);
  }
};

/**
 * Log message
 */
export const logMessage = async (campaignId, userId, userName, characterId, characterName, messageContent, visibility = 'public') => {
  try {
    await base44.functions.invoke('autoLogSessionEvent', {
      campaign_id: campaignId,
      entry_type: 'DM_MESSAGE',
      user_id: userId,
      user_name: userName,
      character_id: characterId,
      character_name: characterName,
      content: messageContent,
      visibility
    });
  } catch (error) {
    console.error('Failed to log message:', error);
  }
};