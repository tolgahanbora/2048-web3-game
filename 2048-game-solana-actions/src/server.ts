import express from 'express';
import { json } from 'body-parser';
import {
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import dotenv from 'dotenv';

dotenv.config();
const DEFAULT_SOL_ADDRESS = new PublicKey('HBsikpQzWWfiBdjRzB2idpHaDXFiVqi23m7TrjT4JXik');
const DEFAULT_SOL_AMOUNT = 1;

const app = express();
app.use(json());

app.options('*', (req, res) => {
  res.set(ACTIONS_CORS_HEADERS).send();
});

app.get('/api/actions/transfer-sol', async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const { toPubkey } = validatedQueryParams(requestUrl);

    const baseHref = new URL(
      `/api/actions/transfer-sol?to=${toPubkey.toBase58()}`,
      requestUrl.origin,
    ).toString();

    const payload: ActionGetResponse = {
      title: 'Actions Example - Transfer Native SOL',
      icon: new URL('/solana_devs.jpg', requestUrl.origin).toString(),
      description: 'Transfer SOL to another Solana wallet',
      label: 'Transfer',
      links: {
        actions: [
          {
            label: 'Send 1 SOL',
            href: `${baseHref}&amount=${'1'}`,
          },
          {
            label: 'Send 5 SOL',
            href: `${baseHref}&amount=${'5'}`,
          },
          {
            label: 'Send 10 SOL',
            href: `${baseHref}&amount=${'10'}`,
          },
          {
            label: 'Send SOL',
            href: `${baseHref}&amount={amount}`,
            parameters: [
              {
                name: 'amount',
                label: 'Enter the amount of SOL to send',
                required: true,
              },
            ],
          },
        ],
      },
    };

    res.set(ACTIONS_CORS_HEADERS).json(payload);
  } catch (err) {
    console.log(err);
    let message = 'An unknown error occurred';
    if (typeof err == 'string') message = err;
    res.status(400).set(ACTIONS_CORS_HEADERS).send(message);
  }
});

app.post('/api/actions/transfer-sol', async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const { amount, toPubkey } = validatedQueryParams(requestUrl);

    const body: ActionPostRequest = req.body;

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return res.status(400).set(ACTIONS_CORS_HEADERS).send('Invalid "account" provided');
    }

    const connection = new Connection(process.env.SOLANA_RPC || clusterApiUrl('devnet'));

    const minimumBalance = await connection.getMinimumBalanceForRentExemption(0);
    if (amount * LAMPORTS_PER_SOL < minimumBalance) {
      throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
    }

    const transaction = new Transaction();

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      }),
    );

    transaction.feePayer = account;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
      },
    });

    res.set(ACTIONS_CORS_HEADERS).json(payload);
  } catch (err) {
    console.log(err);
    let message = 'An unknown error occurred';
    if (typeof err == 'string') message = err;
    res.status(400).set(ACTIONS_CORS_HEADERS).send(message);
  }
});

app.post('/sendTransaction', async (req, res) => {
  try {
    // Gönderen cüzdan adresi
    const secret = process.env.SECRET_KEY!.split(',').map(Number);
    const from = Keypair.fromSecretKey(new Uint8Array(secret));

    // Alıcı cüzdan adresi
    const toWallet = new PublicKey(req.body.toWallet);

    // Transfer miktarı
    const amountInLamports = Number(req.body.amountInLamports); 
    if (isNaN(amountInLamports) || amountInLamports <= 0) {
      return res.status(400).set(ACTIONS_CORS_HEADERS).send('Invalid amount provided');
    }

    const connection = new Connection(process.env.SOLANA_RPC || clusterApiUrl('devnet'));

    // Transfer işlemi oluşturma
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: toWallet,
        lamports: amountInLamports
      })
    );

    // Transfer işlemi gönderme
    const signature = await sendAndConfirmTransaction(connection, transaction, [from]);

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `Send ${amountInLamports / LAMPORTS_PER_SOL} SOL to ${toWallet.toBase58()}`,
      },
    });

    // Add the signature separately
    res.set(ACTIONS_CORS_HEADERS).json({
      ...payload,
      signature
    });
  } catch (error) {
    console.error(error);
    let message = 'An unknown error occurred';
    if (typeof error == 'string') message = error;
    res.status(500).set(ACTIONS_CORS_HEADERS).send(message);
  }
});

function validatedQueryParams(requestUrl: URL) {
  let toPubkey = DEFAULT_SOL_ADDRESS;
  let amount = DEFAULT_SOL_AMOUNT;

  try {
    if (requestUrl.searchParams.get('to')) {
      toPubkey = new PublicKey(requestUrl.searchParams.get('to')!);
    }
  } catch (err) {
    throw 'Invalid input query parameter: to';
  }

  try {
    if (requestUrl.searchParams.get('amount')) {
      amount = parseFloat(requestUrl.searchParams.get('amount')!);
    }

    if (amount <= 0) throw 'amount is too small';
  } catch (err) {
    throw 'Invalid input query parameter: amount';
  }

  return {
    amount,
    toPubkey,
  };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
