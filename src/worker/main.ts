import { loop, stop } from "./index";

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, stop);
loop();
