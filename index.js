const { Connection, PublicKey } = require("@solana/web3.js");

require("dotenv").config();

const RAYDIUM_PUBLIC_KEY = process.env.RAYDIUM_PUBLIC_KEY;
const HTTP_URL = process.env.HTTP_URL;
const WSS_URL = process.env.WSS_URL;

const SESSION_HASH = "QNDEMO" + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session
let credits = 0;

const raydium = new PublicKey(RAYDIUM_PUBLIC_KEY);
// Replace HTTP_URL & WSS_URL with QuickNode HTTPS and WSS Solana Mainnet endpoint
const connection = new Connection(HTTP_URL, {
  wsEndpoint: WSS_URL,
  httpHeaders: { "x-session-hash": SESSION_HASH },
});

// Monitor logs
async function main(connection, programAddress) {
  console.log("Monitoring logs for program:", programAddress.toString());
  connection.onLogs(
    programAddress,
    ({ logs, err, signature }) => {
      if (err) return;

      if (logs && logs.some((log) => log.includes("initialize2"))) {
        console.log("Signature for 'initialize2':", signature);
        fetchRaydiumAccounts(signature, connection);
      }
    },
    "finalized"
  );
}

// Parse transaction and filter data
async function fetchRaydiumAccounts(txId, connection) {
  const tx = await connection.getParsedTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  credits += 100;

  const accounts = tx?.transaction.message.instructions.find(
    (ix) => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY
  ).accounts;

  if (!accounts) {
    console.log("No accounts found in the transaction.");
    return;
  }

  // Extract token amounts from transaction details
  const tokenTransfers = tx.meta.postTokenBalances;
  // console.log("Token Transfers:", tokenTransfers);

  const tokenAIndex = 8;
  const tokenBIndex = 9;

  const tokenAAccount = accounts[tokenAIndex];
  const tokenBAccount = accounts[tokenBIndex];

  let tokenAAmount = 0;
  for (const element of tokenTransfers) {
    if (
      element.mint === tokenAAccount.toBase58() &&
      element.owner === "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
    ) {
      tokenAAmount = element.uiTokenAmount.uiAmount;
      break;
    }
  }

  let tokenBAmount = 0;
  for (const element of tokenTransfers) {
    if (
      element.mint === tokenBAccount.toBase58() &&
      element.owner === "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
    ) {
      tokenBAmount = element.uiTokenAmount.uiAmount;
      break;
    }
  }

  const displayData = [
    {
      Token: "A",
      "Account Public Key": tokenAAccount.toBase58(),
      Amount: tokenAAmount,
    },
    {
      Token: "B",
      "Account Public Key": tokenBAccount.toBase58(),
      Amount: tokenBAmount,
    },
  ];
  console.log("New LP Found");
  console.log(generateExplorerUrl(txId));
  console.table(displayData);
  console.log("Total QuickNode Credits Used in this session:", credits);
}

function generateExplorerUrl(txId) {
  return `https://solscan.io/tx/${txId}`;
}

main(connection, raydium).catch(console.error);
