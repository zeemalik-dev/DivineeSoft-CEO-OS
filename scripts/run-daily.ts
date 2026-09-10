/**
 * Manual trigger for the morning run: `npm run cron:daily`.
 * Useful in development and as a fallback if you host the scheduler elsewhere.
 */
import { runDailyBriefing } from "../src/server/jobs/dailyBriefing";
import { runOnce } from "../src/server/jobs/runner";
import { localDateKey } from "../src/lib/dates";

runOnce("daily-briefing", `manual-${localDateKey()}-${Date.now()}`, runDailyBriefing)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
