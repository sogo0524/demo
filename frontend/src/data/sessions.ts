import realSession01 from "./real_session_01.json";
import { normalizeRealSession } from "../utils/normalizeSession";

export const demoSessions = [
  normalizeRealSession(realSession01, {
    label: "Real pipeline session: test_video_4",
    sourceFile: "src/data/real_session_01.json",
  }),
];
