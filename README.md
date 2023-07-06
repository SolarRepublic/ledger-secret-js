# ledger-secret-js

Interact with the [Ledger Secret App](https://github.com/SecretSaturn/ledger-secret) from Node.js or the Web.

Exports a single class `SecretApp` that extends `CosmosApp` from [ledger-cosmos-js](https://github.com/Zondax/ledger-cosmos-js), adding the following methods:

```ts
export default class SecretApp extends CosmosApp {
    supportsTransparentSigning(): Promise<boolean>;
    signTransparent(path: number[], buffer: Uint8Array, tx_key: Uint8Array, type?: number): Promise<Response>;
}
```
