import "dotenv/config";
import { buildApp } from "./app.js";
import { MockInterpreter } from "./excel-import/mock-interpreter.js";

// RUNUP_MOCK_AI=1 usa o interpretador de exemplo (demo sem ANTHROPIC_API_KEY).
const interpreter = process.env.RUNUP_MOCK_AI ? new MockInterpreter() : undefined;
const app = buildApp({ interpreter });
const port = Number(process.env.PORT ?? 3333);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`RunUp API em http://localhost:${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
