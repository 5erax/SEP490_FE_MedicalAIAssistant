import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "../ui";
import { navigate } from "../../router/navigation";
import { authApi, getStoredAuth } from "../../services/api";
import { findPatientProfileByUserId, rememberCompletedPatientProfile } from "../../services/patientProfileSetup";
import { useAuthSession } from "../../state/useAuthSession";
import { shouldSetupPatientProfile } from "../../utils/roles";
import { getProfileAccountKey, isSameProfileAccount, verifyPatientProfileSetup } from "../../utils/patientProfileCompletion";

function readDismissed(key) {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function VerifiedProfileNudge({ auth, visible }) {
  // A token refresh must not restart verification; switching accounts must.
  const [initialAuth] = useState(() => auth);
  const dismissalKey = `medimate.profile.prompt.dismissed:${getProfileAccountKey(initialAuth)}`;
  const [dismissed, setDismissed] = useState(() => readDismissed(dismissalKey));
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (dismissed) return undefined;
    let active = true;
    verifyPatientProfileSetup({
      auth: initialAuth,
      loadUser: () => authApi.me(),
      findProfile: findPatientProfileByUserId,
    }).then((context) => {
      const currentAuth = getStoredAuth();
      if (!active || !isSameProfileAccount(initialAuth, currentAuth)) return;
      if (!context.required) {
        rememberCompletedPatientProfile(initialAuth, context.user);
        return;
      }
      // A save in another mounted component/tab may have completed while we waited.
      setRequired(shouldSetupPatientProfile(currentAuth));
    }).catch(() => {
      // An optional reminder must never interpret an unavailable API as a missing profile.
      if (active) setRequired(false);
    });
    return () => { active = false; };
  }, [initialAuth, dismissed]);

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(dismissalKey, "true");
    } catch {
      // The in-memory dismissal still works when browser storage is unavailable.
    }
  }

  if (!visible || !required || dismissed) return null;
  return (
    <section className="profile-nudge" aria-labelledby="profile-nudge-title">
      <span aria-hidden="true"><UserRound size={18} /></span>
      <div>
        <h2 id="profile-nudge-title">Hoàn thiện hồ sơ khi bạn sẵn sàng</h2>
        <p>Hồ sơ giúp gợi ý theo bối cảnh sức khỏe tốt hơn, nhưng bạn vẫn có thể dùng tư vấn chuyên khoa ngay.</p>
      </div>
      <div className="profile-nudge-actions">
        <Button type="button" tone="secondary" onClick={dismiss}>Để sau</Button>
        <Button type="button" onClick={() => navigate("/profile")}>Cập nhật hồ sơ</Button>
      </div>
    </section>
  );
}

export default function PatientProfileNudge({ visible = true }) {
  const { auth } = useAuthSession();
  const accountKey = getProfileAccountKey(auth);
  // Subscribe to completion changes instead of keeping the initial login snapshot.
  if (!accountKey || !shouldSetupPatientProfile(auth)) return null;
  return <VerifiedProfileNudge key={accountKey} auth={auth} visible={visible} />;
}
