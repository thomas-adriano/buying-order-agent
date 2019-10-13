import * as http from "http2";
import { CronJob } from "cron";
import { EmailSender } from "./email-sender";
import { ApiClient } from "./api-client";

console.log("Buying Order Agent is starting...");

process.on("message", msg => {
  if (msg === "shutdown") {
    shutdown();
  }
});

process.on("SIGINT", function() {
  shutdown();
});

const [jwtKey] = process.argv.slice(2);

const cronJob = new CronJob(
  "0,5,10,15,20,25,30,35,40,45,50,55 * * * * *",
  () => {
    console.log("Running Cron job");
    runOrdersVerification();
  },
  undefined,
  true,
  "America/Sao_Paulo"
);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write(`running`);
  res.end();
});

server.listen(8888, "0.0.0.0", () => {
  console.log("Buying Order Agent server has started.");
  cronJob.start();
  runOrdersVerification();
});

server.on("error", err => console.error(err));

async function runOrdersVerification(): Promise<any> {
  const apiClient = new ApiClient(jwtKey);
  const orders = await apiClient
    .fetchBuyingOrders()
    .catch(err => console.error(err));

  const emailSender = new EmailSender();
  // create reusable transporter object using the default SMTP transport
  return emailSender.sendEmail(
    {
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "viola.von@ethereal.email", // generated ethereal user
        pass: "Q61Z2qsRsmg7nUEzNG" // generated ethereal password
      }
    },
    {
      from: '"Fred Foo 👻" <foo@example.com>', // sender address
      to: "viola.von@ethereal.email", // list of receivers
      subject: "Hello ✔", // Subject line
      text: "Hello world?", // plain text body
      html: "<b>Hello world?</b>" // html body
    }
  );
}

function shutdown(): void {
  console.log("Buying Order Agent is shutting down");
  cronJob.stop();
  server.close();
}
