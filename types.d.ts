type AlertType = "normal" | "success" | "error";
// ============================================================
// types.d.ts — تعريفات الأنواع العامة | Global Type Declarations
// ============================================================

// Firebase globals (loaded via CDN)
declare namespace firebase {
  function initializeApp(config: object): firebase.app.App;
  const apps: firebase.app.App[];

  namespace app {
    interface App { name: string; }
  }

  namespace firestore {
    function firestore(): Firestore;

    interface Firestore {
      collection(path: string): CollectionReference;
    }

    interface CollectionReference {
      doc(id: string): DocumentReference;
      where(field: string, op: string, value: unknown): Query;
      get(): Promise<QuerySnapshot>;
      onSnapshot(cb: (snap: QuerySnapshot) => void): () => void;
    }

    interface DocumentReference {
      get(): Promise<DocumentSnapshot>;
      set(data: object): Promise<void>;
      update(data: object): Promise<void>;
      onSnapshot(cb: (doc: DocumentSnapshot) => void): () => void;
      collection(path: string): CollectionReference;
    }

    interface Query {
      get(): Promise<QuerySnapshot>;
      onSnapshot(cb: (snap: QuerySnapshot) => void): () => void;
      onSnapshot(cb: (snap: QuerySnapshot) => void): () => void;
    }

    interface QuerySnapshot {
      empty: boolean;
      docs: QueryDocumentSnapshot[];
      forEach(cb: (doc: QueryDocumentSnapshot) => void): void;
    }

    interface DocumentSnapshot {
      exists: boolean;
      id: string;
      data(): Record<string, unknown> | undefined;
    }

    interface QueryDocumentSnapshot extends DocumentSnapshot {
      data(): Record<string, unknown>;
    }

    namespace FieldValue {
      function increment(n: number): object;
      function serverTimestamp(): object;
    }
  }
}

// window extensions
interface PowerUps {
  freeze: number;
  fifty50: number;
}


interface Window {
  // App state
  myPowerups: PowerUps;
  isQuizActive?: boolean;

  // App functions
  showAlert(title: string, msg: string, icon?: string, type?: AlertType): void;
  closeCustomAlert(): void;
  showTab(t: "arena" | "leaderboard"): void;
  logoutUser(): void;

  // Map render (defined in dashboard.html)
  __renderMapEnhanced?(
    container: HTMLElement,
    myLogs: Record<number, number>,
    adminDay: number,
    adminStatus: string
  ): void;

  // Quiz functions
  openQuiz(day: number): void;
  closeQuizOverlay(): void;
  startQuizFetch(day: number): void;
  handleAnswer(idx: number): void;
  use5050(): void;
  useFreeze(): void;

  // Night question
  openNightQuestion(): void;
  handleNightAnswer(idx: number): void;
  closeNightQuestion(): void;

  // Wheel
  openSpinWheel(): void;
  closeSpinWheel(): void;
  spinWheel(): void;

  // Anti-cheat
  showAcWarning?(msg: string): void;
  triggerAntiCheat?(reason: string): void;
  _acResume?(): void;
  _acForceEnd?(): void;

  // confetti (CDN)
  confetti?(opts: object): Promise<void>;

  // App-level state refs (set by app.ts)
  myLogs?: Record<number, number>;
}

// Firebase app globals
