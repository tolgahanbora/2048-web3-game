"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const actions_1 = require("@solana/actions");
const web3_js_1 = require("@solana/web3.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEFAULT_SOL_ADDRESS = new web3_js_1.PublicKey('HBsikpQzWWfiBdjRzB2idpHaDXFiVqi23m7TrjT4JXik');
const DEFAULT_SOL_AMOUNT = 1;
const app = (0, express_1.default)();
app.use((0, body_parser_1.json)());
app.options('*', (req, res) => {
    res.set(actions_1.ACTIONS_CORS_HEADERS).send();
});
app.get('/api/actions/transfer-sol', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const { toPubkey } = validatedQueryParams(requestUrl);
        const baseHref = new URL(`/api/actions/transfer-sol?to=${toPubkey.toBase58()}`, requestUrl.origin).toString();
        const payload = {
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
        res.set(actions_1.ACTIONS_CORS_HEADERS).json(payload);
    }
    catch (err) {
        console.log(err);
        let message = 'An unknown error occurred';
        if (typeof err == 'string')
            message = err;
        res.status(400).set(actions_1.ACTIONS_CORS_HEADERS).send(message);
    }
}));
app.post('/api/actions/transfer-sol', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const { amount, toPubkey } = validatedQueryParams(requestUrl);
        const body = req.body;
        let account;
        try {
            account = new web3_js_1.PublicKey(body.account);
        }
        catch (err) {
            return res.status(400).set(actions_1.ACTIONS_CORS_HEADERS).send('Invalid "account" provided');
        }
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC || (0, web3_js_1.clusterApiUrl)('devnet'));
        const minimumBalance = yield connection.getMinimumBalanceForRentExemption(0);
        if (amount * web3_js_1.LAMPORTS_PER_SOL < minimumBalance) {
            throw `account may not be rent exempt: ${toPubkey.toBase58()}`;
        }
        const transaction = new web3_js_1.Transaction();
        transaction.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: account,
            toPubkey: toPubkey,
            lamports: amount * web3_js_1.LAMPORTS_PER_SOL,
        }));
        transaction.feePayer = account;
        transaction.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
        const payload = yield (0, actions_1.createPostResponse)({
            fields: {
                transaction,
                message: `Send ${amount} SOL to ${toPubkey.toBase58()}`,
            },
        });
        res.set(actions_1.ACTIONS_CORS_HEADERS).json(payload);
    }
    catch (err) {
        console.log(err);
        let message = 'An unknown error occurred';
        if (typeof err == 'string')
            message = err;
        res.status(400).set(actions_1.ACTIONS_CORS_HEADERS).send(message);
    }
}));
app.post('/sendTransaction', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Gönderen cüzdan adresi
        const secret = process.env.SECRET_KEY.split(',').map(Number);
        const from = web3_js_1.Keypair.fromSecretKey(new Uint8Array(secret));
        // Alıcı cüzdan adresi
        const toWallet = new web3_js_1.PublicKey(req.body.toWallet);
        // Transfer miktarı
        const amountInLamports = Number(req.body.amountInLamports);
        if (isNaN(amountInLamports) || amountInLamports <= 0) {
            return res.status(400).set(actions_1.ACTIONS_CORS_HEADERS).send('Invalid amount provided');
        }
        const connection = new web3_js_1.Connection(process.env.SOLANA_RPC || (0, web3_js_1.clusterApiUrl)('devnet'));
        // Transfer işlemi oluşturma
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: toWallet,
            lamports: amountInLamports
        }));
        // Transfer işlemi gönderme
        const signature = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [from]);
        const payload = yield (0, actions_1.createPostResponse)({
            fields: {
                transaction,
                message: `Send ${amountInLamports / web3_js_1.LAMPORTS_PER_SOL} SOL to ${toWallet.toBase58()}`,
            },
        });
        // Add the signature separately
        res.set(actions_1.ACTIONS_CORS_HEADERS).json(Object.assign(Object.assign({}, payload), { signature }));
    }
    catch (error) {
        console.error(error);
        let message = 'An unknown error occurred';
        if (typeof error == 'string')
            message = error;
        res.status(500).set(actions_1.ACTIONS_CORS_HEADERS).send(message);
    }
}));
function validatedQueryParams(requestUrl) {
    let toPubkey = DEFAULT_SOL_ADDRESS;
    let amount = DEFAULT_SOL_AMOUNT;
    try {
        if (requestUrl.searchParams.get('to')) {
            toPubkey = new web3_js_1.PublicKey(requestUrl.searchParams.get('to'));
        }
    }
    catch (err) {
        throw 'Invalid input query parameter: to';
    }
    try {
        if (requestUrl.searchParams.get('amount')) {
            amount = parseFloat(requestUrl.searchParams.get('amount'));
        }
        if (amount <= 0)
            throw 'amount is too small';
    }
    catch (err) {
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
