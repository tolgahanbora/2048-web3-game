const express = require('express');
const bodyParser = require('body-parser');
const {
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} = require('@solana/actions');
const {
  clusterApiUrl,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');
const dotenv = require('dotenv');

dotenv.config();
const DEFAULT_SOL_ADDRESS = new PublicKey('HBsikpQzWWfiBdjRzB2idpHaDXFiVqi23m7TrjT4JXik');
const DEFAULT_SOL_AMOUNT = 1; // Set default amount if necessary

const app = express();
app.use(bodyParser.json());

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

    const payload = {
      title: 'Actions Example - Transfer Native SOL',
      icon: new URL('/solana_devs.jpg', requestUrl.origin).toString(),
      description: 'Transfer SOL to another Solana wallet',
      label: 'Transfer', // this value will be ignored since `links.actions` exists
      links: {
        actions: [
          {
            label: 'Send 1 SOL', // button text
            href: `${baseHref}&amount=${'1'}`,
          },
          {
            label: 'Send 5 SOL', // button text
            href: `${baseHref}&amount=${'5'}`,
          },
          {
            label: 'Send 10 SOL', // button text
            href: `${baseHref}&amount=${'10'}`,
          },
          {
            label: 'Send SOL', // button text
            href: `${baseHref}&amount={amount}`, // this href will have a text input
            parameters: [
              {
                name: 'amount', // parameter name in the `href` above
                label: 'Enter the amount of SOL to send', // placeholder of the text input
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

    const body = req.body;

    // validate the client provided input
    let account;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      return res.status(400).set(ACTIONS_CORS_HEADERS).send('Invalid "account" provided');
    }

    const connection = new Connection(process.env.SOLANA_RPC || clusterApiUrl('devnet'));

    // ensure the receiving account will be rent exempt
    const minimumBalance = await connection.getMinimumBalanceForRentExemption(
      0, // note: simple accounts that just store native SOL have `0` bytes of data
    );
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

    // set the end user as the fee payer
    transaction.feePayer = account;

    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const payload = await createPostResponse({
      fields: {
        transaction,
        message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
      },
      // note: no additional signers are needed
      // signers: [],
    });

    res.set(ACTIONS_CORS_HEADERS).json(payload);
  } catch (err) {
    console.log(err);
    let message = 'An unknown error occurred';
    if (typeof err == 'string') message = err;
    res.status(400).set(ACTIONS_CORS_HEADERS).send(message);
  }
});

function validatedQueryParams(requestUrl) {
  let toPubkey = DEFAULT_SOL_ADDRESS;
  let amount = DEFAULT_SOL_AMOUNT;

  try {
    if (requestUrl.searchParams.get('to')) {
      toPubkey = new PublicKey(requestUrl.searchParams.get('to'));
    }
  } catch (err) {
    throw 'Invalid input query parameter: to';
  }

  try {
    if (requestUrl.searchParams.get('amount')) {
      amount = parseFloat(requestUrl.searchParams.get('amount'));
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
