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
