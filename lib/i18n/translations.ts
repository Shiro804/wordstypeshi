// Translation strings for English and German
// All UI text should be defined here for consistency

export type Language = 'en' | 'de';

export const translations = {
  en: {
    // Common
    common: {
      login: "Login",
      register: "Register",
      logout: "Logout",
      settings: "Settings",
      play: "Play",
      score: "Score",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
      back: "Back",
      next: "Next",
      submit: "Submit",
      newGame: "New Game",
      playAgain: "Play Again",
      gameOver: "Game Over",
      youWin: "You Win!",
      youLose: "You Lose",
      time: "Time",
      moves: "Moves",
      guesses: "Guesses",
      hint: "Hint",
      undo: "Undo",
      leaderboard: "Leaderboard",
      statistics: "Statistics",
      language: "Language",
    },

    // Hub / Homepage
    hub: {
      title: "BataGames",
      subtitle: "Free word puzzles without ads",
      selectGame: "Select a game",
      guestTip: "Register for free to save your progress and appear on the leaderboard!",
      moreGamesSoon: "More games coming soon...",
      continueAsGuest: "Continue as guest →",
      profile: "Profile",
      account: "Account",
      gameCount: "{n} games",
    },

    // Auth
    auth: {
      welcomeBack: "Welcome back!",
      loginSubtitle: "Sign in to continue playing",
      createAccount: "Create account",
      signupSubtitle: "Save your progress & appear on the leaderboard",
      email: "Email",
      password: "Password",
      repeatPassword: "Repeat password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      loggingIn: "Logging in...",
      creatingAccount: "Creating account...",
      passwordsDontMatch: "Passwords do not match",
      // Forgot password
      forgotTitle: "Forgot password?",
      forgotSubtitle: "No problem! Enter your email and we'll send you a reset link.",
      sendResetLink: "Send reset link",
      sending: "Sending...",
      emailSent: "Email sent!",
      emailSentDesc: "We've sent you an email with a link to reset your password.",
      backToLogin: "Back to login",
      rememberPassword: "Remember your password?",
    },

    // Settings
    settings: {
      title: "Settings",
      profile: "Profile",
      account: "Account",
      username: "Username",
      pickUsername: "Pick a username",
      usernameHint: "2-20 characters. Letters, numbers, underscore, dash, dot.",
      profilePicture: "Profile picture",
      upload: "Upload",
      remove: "Remove",
      uploading: "Uploading...",
      appearance: "Appearance",
      gameplay: "Gameplay",
      difficulty: "Difficulty",
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      saving: "Saving...",
      close: "Close",
      // Duck customizer
      image: "Image",
      uploadImage: "Upload Image",
      removeImage: "Remove Image",
      none: "None",
      colors: "Colors",
      background: "Background",
      body: "Body",
      belly: "Belly",
      beak: "Beak",
      eyes: "Eyes",
      reset: "Reset",
      logout: "Logout",
    },

    // Games shared
    games: {
      englishWordsHint: "ℹ️ Currently only English words available",
      round: "Round",
      timer: "Timer",
      found: "Found",
      remaining: "Remaining",
      combo: "Combo",
      lines: "Lines",
      forfeitTitle: "Start New Game?",
      forfeitMessage: "Your current game will count as a loss. Are you sure?",
      forfeitConfirm: "Yes, start new",
    },

    // Wordle
    wordle: {
      name: "BatasWordle",
      description: "Guess the word in 6 tries",
      guessPlaceholder: "Type a 5-letter word",
      invalidWord: "Not a valid word",
      correctWord: "The word was",
      usedLetters: "Used letters",
    },

    // Mastermind
    mastermind: {
      name: "BatasMind",
      description: "Crack the color code",
      secretCode: "Secret Code",
      attempts: "Attempts",
      attemptsRemaining: "attempts remaining",
      correct: "Correct",
      wrongPosition: "Wrong position",
      selectColor: "Select a color",
      checkGuess: "Guess",
      codeRevealed: "Code revealed!",
      delete: "Delete",
      solvedIn: "Code cracked in {n} attempts",
    },

    // WordSearch
    wordsearch: {
      name: "BatasSearch",
      description: "Find the hidden words",
      wordsToFind: "Words to find",
      wordsFound: "words found",
      allWordsFound: "All words found!",
      done: "Done!",
      time: "Time",
      misselects: "Misses",
    },

    // BatasBlast
    batasblast: {
      name: "BatasBlast",
      description: "Clear rows and columns",
      noMovesLeft: "No moves left!",
      finalScore: "Final Score",
      gameOver: "Game Over",
      score: "Score",
      best: "Best",
      highScore: "High Score",
      tapOrDrag: "Tap or drag a piece, then place it on the board",
      totalLines: "Total Lines",
      bestCombo: "Best Combo",
    },

    // BatasColors
    batascolors: {
      name: "BatasColors",
      description: "Mix colors to match the target",
      targetColor: "Target Color",
      accuracy: "Accuracy",
      mix: "Mix",
      clear: "Clear",
      attemptsRemaining: "attempts remaining",
      perfect: "Perfect match!",
      almostThere: "Almost there!",
      previousAttempts: "Previous Attempts",
    },

    // BatasPairs
    bataspairs: {
      name: "BatasPairs",
      description: "Find all matching pairs",
      pairsFound: "pairs found",
      pairsRemaining: "pairs remaining",
      flips: "Flips",
      mismatches: "Misses",
      allPairsFound: "All pairs found!",
      solvedIn: "Solved in {flips} flips with {mismatches} misses",
    },

    // BatasMine
    batasmine: {
      name: "BatasMine",
      description: "Reveal all safe cells",
      cellsRevealed: "revealed",
      minesRemaining: "mines left",
      flagModeOn: "Flag mode (on)",
      flagModeOff: "Flag mode (off)",
      solvedIn: "Cleared {cells} cells in {time}",
      hitMine: "You hit a mine!",
    },

    // BatasFlow
    batasflow: {
      name: "BatasFlow",
      description: "Connect matching dots",
      flowsConnected: "Flows connected",
      flowsRemaining: "Flows remaining",
      cellsFilled: "Cells filled",
      allFlowsConnected: "All flows connected!",
      solvedIn: "Solved in {moves} moves",
    },

    // BatasBottles
    batasbottles: {
      name: "BatasBottles",
      description: "Pour liquids to fill the big bottle",
      targetColor: "Target color",
      layersFilled: "layers filled",
      bigBottleFilled: "Big bottle filled!",
      solvedIn: "Solved in {moves} pours",
      tapToPour: "Tap a bottle, then tap another to pour",
      levelLabel: "Level {n}",
      filledOfTotal: "{filled} / {total} filled",
      movesUsed: "{moves} moves",
      outOfMoves: "Out of moves — try again!",
    },

    // Shared level system UI
    levels: {
      levelSelect: "Select level",
      level: "Level",
      locked: "Locked",
      unlocked: "Unlocked",
      complete: "Complete",
      resume: "Continue",
      phase: "Phase",
      totalStars: "Total stars",
      allLevelsComplete: "All levels complete!",
      movesLeft: "Moves left",
      noMoveLimit: "No move limit",
      starsEarned: "Stars earned",
      levelComplete: "Level complete!",
      levelFailed: "Out of moves",
      nextLevel: "Next level",
      retry: "Retry",
      backToLevels: "Back to levels",
      newBest: "New best!",
      bestMoves: "Best",
      // Phase labels used by batasbottles (reusable generic labels)
      phaseTutorial: "Tutorial",
      phaseEasy: "Easy",
      phaseMedium: "Medium",
      phaseHard: "Hard",
      phaseExpert: "Expert",
    },

    // Leaderboard
    leaderboard: {
      title: "Leaderboard",
      difficulty: "Difficulty",
      sortBy: "Sort by",
      loading: "Loading...",
      noStats: "No stats yet.",
      // Metrics
      wins: "Wins",
      losses: "Losses",
      winRate: "Win rate",
      played: "Played",
      maxStreak: "Max streak",
      bestTime: "Best time",
      avgTime: "Avg time",
      highScore: "Highscore",
      bestMismatches: "Fewest Misses",
      maxLevel: "Max level",
      totalStars: "Total stars",
    },

    // Modals
    modals: {
      resetTitle: "Reset game?",
      resetMessage: "You already made some progress. Resetting now will count as a loss.",
      resetConfirm: "Reset (counts as loss)",
      difficultyTitle: "Change difficulty?",
      difficultyMessage: "Changing difficulty now will forfeit this game and count as a loss.",
      difficultyConfirm: "Switch (counts as loss)",
    },
  },

  de: {
    // Common
    common: {
      login: "Anmelden",
      register: "Registrieren",
      logout: "Abmelden",
      settings: "Einstellungen",
      play: "Spielen",
      score: "Punkte",
      save: "Speichern",
      cancel: "Abbrechen",
      close: "Schließen",
      loading: "Laden...",
      error: "Fehler",
      success: "Erfolg",
      confirm: "Bestätigen",
      yes: "Ja",
      no: "Nein",
      back: "Zurück",
      next: "Weiter",
      submit: "Absenden",
      newGame: "Neues Spiel",
      playAgain: "Nochmal spielen",
      gameOver: "Spiel vorbei",
      youWin: "Gewonnen!",
      youLose: "Verloren",
      time: "Zeit",
      moves: "Züge",
      guesses: "Versuche",
      hint: "Hinweis",
      undo: "Rückgängig",
      leaderboard: "Bestenliste",
      statistics: "Statistiken",
      language: "Sprache",
    },

    // Hub / Homepage
    hub: {
      title: "BataGames",
      subtitle: "Kostenlose Wortspiele ohne Werbung",
      selectGame: "Wähle ein Spiel",
      guestTip: "Registriere dich kostenlos, um deinen Fortschritt zu speichern und im Leaderboard zu erscheinen!",
      moreGamesSoon: "Weitere Spiele kommen bald...",
      continueAsGuest: "Als Gast weiterspielen →",
      profile: "Profil",
      account: "Konto",
      gameCount: "{n} Spiele",
    },

    // Auth
    auth: {
      welcomeBack: "Willkommen zurück!",
      loginSubtitle: "Melde dich an, um weiterzuspielen",
      createAccount: "Account erstellen",
      signupSubtitle: "Speichere deinen Fortschritt & erscheine im Leaderboard",
      email: "Email",
      password: "Passwort",
      repeatPassword: "Passwort wiederholen",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Noch kein Account?",
      hasAccount: "Bereits einen Account?",
      loggingIn: "Anmelden...",
      creatingAccount: "Account erstellen...",
      passwordsDontMatch: "Passwörter stimmen nicht überein",
      // Forgot password
      forgotTitle: "Passwort vergessen?",
      forgotSubtitle: "Kein Problem! Gib deine Email ein und wir senden dir einen Reset-Link.",
      sendResetLink: "Reset-Link senden",
      sending: "Senden...",
      emailSent: "Email gesendet!",
      emailSentDesc: "Wir haben dir eine Email mit einem Link zum Zurücksetzen deines Passworts geschickt.",
      backToLogin: "Zurück zum Login",
      rememberPassword: "Passwort wieder eingefallen?",
    },

    // Settings
    settings: {
      title: "Einstellungen",
      profile: "Profil",
      account: "Account",
      username: "Benutzername",
      pickUsername: "Wähle einen Benutzernamen",
      usernameHint: "2-20 Zeichen. Buchstaben, Zahlen, _, -, .",
      profilePicture: "Profilbild",
      upload: "Hochladen",
      remove: "Entfernen",
      uploading: "Hochladen...",
      appearance: "Aussehen",
      gameplay: "Spieleinstellungen",
      difficulty: "Schwierigkeit",
      easy: "Leicht",
      medium: "Mittel",
      hard: "Schwer",
      saving: "Speichern...",
      close: "Schließen",
      // Duck customizer
      image: "Bild",
      uploadImage: "Bild hochladen",
      removeImage: "Bild entfernen",
      none: "Keins",
      colors: "Farben",
      background: "Hintergrund",
      body: "Körper",
      belly: "Bauch",
      beak: "Schnabel",
      eyes: "Augen",
      reset: "Zurücksetzen",
      logout: "Abmelden",
    },

    // Games shared
    games: {
      englishWordsHint: "ℹ️ Aktuell nur englische Wörter verfügbar",
      round: "Runde",
      timer: "Zeit",
      found: "Gefunden",
      remaining: "Übrig",
      combo: "Kombo",
      lines: "Reihen",
      forfeitTitle: "Neues Spiel starten?",
      forfeitMessage: "Dein aktuelles Spiel wird als Niederlage gewertet. Bist du sicher?",
      forfeitConfirm: "Ja, neu starten",
    },

    // Wordle
    wordle: {
      name: "BatasWordle",
      description: "Errate das Wort in 6 Versuchen",
      guessPlaceholder: "Gib ein 5-Buchstaben-Wort ein",
      invalidWord: "Kein gültiges Wort",
      correctWord: "Das Wort war",
      usedLetters: "Verwendete Buchstaben",
    },

    // Mastermind
    mastermind: {
      name: "BatasMind",
      description: "Knacke den Farbcode",
      secretCode: "Geheimer Code",
      attempts: "Versuche",
      attemptsRemaining: "Versuche übrig",
      correct: "Richtig",
      wrongPosition: "Falsche Position",
      selectColor: "Wähle eine Farbe",
      checkGuess: "Raten",
      codeRevealed: "Code enthüllt!",
      delete: "Löschen",
      solvedIn: "Code in {n} Versuchen geknackt",
    },

    // WordSearch
    wordsearch: {
      name: "BatasSearch",
      description: "Finde die versteckten Wörter",
      wordsToFind: "Wörter zu finden",
      wordsFound: "Wörter gefunden",
      allWordsFound: "Alle Wörter gefunden!",
      done: "Geschafft!",
      time: "Zeit",
      misselects: "Fehlversuche",
    },

    // BatasBlast
    batasblast: {
      name: "BatasBlast",
      description: "Räume Reihen und Spalten ab",
      noMovesLeft: "Keine Züge mehr!",
      finalScore: "Endpunktzahl",
      gameOver: "Spiel vorbei",
      score: "Punkte",
      best: "Bester",
      highScore: "Highscore",
      tapOrDrag: "Tippe oder ziehe ein Teil, dann platziere es auf dem Feld",
      totalLines: "Reihen gesamt",
      bestCombo: "Beste Kombo",
    },

    // BatasColors
    batascolors: {
      name: "BatasColors",
      description: "Mische Farben um die Zielfarbe zu treffen",
      targetColor: "Zielfarbe",
      accuracy: "Genauigkeit",
      mix: "Mischen",
      clear: "Löschen",
      attemptsRemaining: "Versuche übrig",
      perfect: "Perfekte Mischung!",
      almostThere: "Fast geschafft!",
      previousAttempts: "Bisherige Versuche",
    },

    // BatasPairs
    bataspairs: {
      name: "BatasPairs",
      description: "Finde alle passenden Paare",
      pairsFound: "Paare gefunden",
      pairsRemaining: "Paare übrig",
      flips: "Aufdeckungen",
      mismatches: "Fehlversuche",
      allPairsFound: "Alle Paare gefunden!",
      solvedIn: "Gelöst in {flips} Zügen mit {mismatches} Fehlversuchen",
    },

    // BatasMine
    batasmine: {
      name: "BatasMine",
      description: "Decke alle sicheren Felder auf",
      cellsRevealed: "aufgedeckt",
      minesRemaining: "Minen übrig",
      flagModeOn: "Flaggen-Modus (an)",
      flagModeOff: "Flaggen-Modus (aus)",
      solvedIn: "{cells} Felder in {time} geräumt",
      hitMine: "Du hast eine Mine getroffen!",
    },

    // BatasFlow
    batasflow: {
      name: "BatasFlow",
      description: "Verbinde passende Punkte",
      flowsConnected: "Flows verbunden",
      flowsRemaining: "Flows übrig",
      cellsFilled: "Zellen gefüllt",
      allFlowsConnected: "Alle Flows verbunden!",
      solvedIn: "Gelöst in {moves} Zügen",
    },

    // BatasBottles
    batasbottles: {
      name: "BatasBottles",
      description: "Gieße Flüssigkeit in die große Flasche",
      targetColor: "Zielfarbe",
      layersFilled: "Schichten gefüllt",
      bigBottleFilled: "Große Flasche gefüllt!",
      solvedIn: "Gelöst in {moves} Güssen",
      tapToPour: "Tippe eine Flasche, dann eine andere zum Umfüllen",
      levelLabel: "Level {n}",
      filledOfTotal: "{filled} / {total} gefüllt",
      movesUsed: "{moves} Züge",
      outOfMoves: "Züge aufgebraucht — versuch's nochmal!",
    },

    // Shared level system UI
    levels: {
      levelSelect: "Level wählen",
      level: "Level",
      locked: "Gesperrt",
      unlocked: "Freigeschaltet",
      complete: "Abgeschlossen",
      resume: "Weiter",
      phase: "Phase",
      totalStars: "Sterne gesamt",
      allLevelsComplete: "Alle Level abgeschlossen!",
      movesLeft: "Züge übrig",
      noMoveLimit: "Kein Zuglimit",
      starsEarned: "Sterne erhalten",
      levelComplete: "Level geschafft!",
      levelFailed: "Keine Züge mehr",
      nextLevel: "Nächstes Level",
      retry: "Nochmal",
      backToLevels: "Zur Levelauswahl",
      newBest: "Neuer Rekord!",
      bestMoves: "Beste",
      // Phase labels used by batasbottles (reusable generic labels)
      phaseTutorial: "Tutorial",
      phaseEasy: "Einfach",
      phaseMedium: "Mittel",
      phaseHard: "Schwer",
      phaseExpert: "Experte",
    },

    // Leaderboard
    leaderboard: {
      title: "Bestenliste",
      difficulty: "Schwierigkeit",
      sortBy: "Sortieren nach",
      loading: "Laden...",
      noStats: "Noch keine Statistiken.",
      // Metrics
      wins: "Siege",
      losses: "Niederlagen",
      winRate: "Siegesrate",
      played: "Gespielt",
      maxStreak: "Max Serie",
      bestTime: "Beste Zeit",
      avgTime: "Ø Zeit",
      highScore: "Highscore",
      bestMismatches: "Wenigste Fehler",
      maxLevel: "Max Level",
      totalStars: "Sterne gesamt",
    },

    // Modals
    modals: {
      resetTitle: "Spiel zurücksetzen?",
      resetMessage: "Du hast bereits Fortschritt gemacht. Zurücksetzen zählt als Niederlage.",
      resetConfirm: "Zurücksetzen (zählt als Niederlage)",
      difficultyTitle: "Schwierigkeit ändern?",
      difficultyMessage: "Schwierigkeit ändern wertet dieses Spiel als Niederlage.",
      difficultyConfirm: "Wechseln (zählt als Niederlage)",
    },
  },
} as const;

// Type helper for accessing translations - uses structure from EN as base
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

export type TranslationKeys = DeepStringify<typeof translations.en>;
