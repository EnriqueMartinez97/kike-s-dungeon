/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import CampaignDetail from './pages/CampaignDetail';
import CampaignSettings from './pages/CampaignSettings';
import Campaigns from './pages/Campaigns';
import CharacterSheet from './pages/CharacterSheet';
import Characters from './pages/Characters';
import CreateCampaign from './pages/CreateCampaign';
import DocumentEditor from './pages/DocumentEditor';
import Documents from './pages/Documents';
import EpisodeDetail from './pages/EpisodeDetail';
import EpisodeEditor from './pages/EpisodeEditor';
import Home from './pages/Home';
import MyLibrary from './pages/MyLibrary';
import MyNPCs from './pages/MyNPCs';
import NPCEditor from './pages/NPCEditor';
import NPCs from './pages/NPCs';
import Profile from './pages/Profile';
import QuestDetail from './pages/QuestDetail';
import QuestEditor from './pages/QuestEditor';
import Session from './pages/Session';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CampaignDetail": CampaignDetail,
    "CampaignSettings": CampaignSettings,
    "Campaigns": Campaigns,
    "CharacterSheet": CharacterSheet,
    "Characters": Characters,
    "CreateCampaign": CreateCampaign,
    "DocumentEditor": DocumentEditor,
    "Documents": Documents,
    "EpisodeDetail": EpisodeDetail,
    "EpisodeEditor": EpisodeEditor,
    "Home": Home,
    "MyLibrary": MyLibrary,
    "MyNPCs": MyNPCs,
    "NPCEditor": NPCEditor,
    "NPCs": NPCs,
    "Profile": Profile,
    "QuestDetail": QuestDetail,
    "QuestEditor": QuestEditor,
    "Session": Session,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};