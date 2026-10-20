import { useState, useCallback } from "react";
import { Lobby, type Screen } from "@/ui/screens/Lobby";
import { GameCanvas } from "@/ui/screens/GameCanvas";
import { GachaScreen } from "@/ui/screens/GachaScreen";
import { CodexScreen } from "@/ui/screens/CodexScreen";
import { AchievementsScreen } from "@/ui/screens/AchievementsScreen";
import { CharacterScreen } from "@/ui/screens/CharacterScreen";
import { TraitsScreen } from "@/ui/screens/TraitsScreen";
import { ConstraintScreen } from "@/ui/screens/ConstraintScreen";
import { SettingsScreen } from "@/ui/screens/SettingsScreen";
import { loadSave, saveSave, type SaveData } from "@/game/core/storage";

function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [save, setSave] = useState<SaveData>(() => loadSave());

  const goLobby = () => {
    setSave(loadSave());
    setScreen("lobby");
  };

  const handleSaveUpdate = useCallback((next: SaveData) => {
    setSave(next);
    saveSave(next);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {screen === "lobby" && <Lobby onNavigate={setScreen} save={save} />}
      {screen === "game" && <GameCanvas onExit={goLobby} save={save} />}
      {screen === "gacha" && (
        <GachaScreen onBack={goLobby} save={save} onUpdate={handleSaveUpdate} />
      )}
      {screen === "characters" && (
        <CharacterScreen onBack={goLobby} save={save} onUpdate={handleSaveUpdate} />
      )}
      {screen === "traits" && (
        <TraitsScreen onBack={goLobby} save={save} onUpdate={handleSaveUpdate} />
      )}
      {screen === "constraints" && (
        <ConstraintScreen onBack={goLobby} save={save} onUpdate={handleSaveUpdate} />
      )}
      {screen === "settings" && <SettingsScreen onBack={goLobby} />}
      {screen === "codex" && <CodexScreen onBack={goLobby} />}
      {screen === "achievements" && (
        <AchievementsScreen onBack={goLobby} save={save} />
      )}
    </div>
  );
}

export default App;
