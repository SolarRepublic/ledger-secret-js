import type Transport from '@ledgerhq/hw-transport';

import {buffer_to_text, concat2} from '@blake.regalia/belt';

import {CosmosApp} from '@zondax/ledger-cosmos-js';
import {CLA, ERROR_CODE, INS, P1_VALUES, P2_VALUES, errorCodeToString, getVersion, processErrorResponse} from '@zondax/ledger-cosmos-js/dist/common';

const INS_SECRET = {
	SIGN_SECP256K1_TRANSPARENT: INS.SIGN_SECP256K1 | 0x40,
};

interface Response {
	signature: Uint8Array;
	return_code: number;
	error_message: string;
}

async function send_chunk(y_transport: Transport, xc_type: number, atu8_chunk: Uint8Array, b_final: boolean) {
	return y_transport.send(CLA, INS_SECRET.SIGN_SECP256K1_TRANSPARENT, b_final? 2: 1, xc_type, atu8_chunk as Buffer, [ERROR_CODE.NoError, 0x6984, 0x6a80])
		.then((atu8_response) => {
			const atu8_error = atu8_response.subarray(-2);
			const xc_return = (atu8_error[0]! * 256) + atu8_error[1]!;
			let s_error = errorCodeToString(xc_return);

			if(0x6a80 === xc_return || 0x6984 === xc_return) {
				s_error = `${s_error} : ${buffer_to_text(atu8_response.subarray(0, atu8_response.length - 2))}`;
			}

			let atu8_signature = null;
			if(atu8_response.length > 2) {
				atu8_signature = atu8_response.subarray(0, atu8_response.length - 2);
			}

			return {
				signature: atu8_signature,
				return_code: xc_return,
				error_message: s_error,
			};
		}, processErrorResponse);
}

export default class SecretApp extends CosmosApp {
	async supportsTransparentSigning(): Promise<boolean> {
		this.versionResponse = await getVersion(this.transport);

		if(this.versionResponse.return_code !== ERROR_CODE.NoError) {
			throw this.versionResponse;
		}

		return this.versionResponse.major > 2
			|| (2 === this.versionResponse && this.versionResponse.minor >= 36);
	}

	async signTransparent(a_path: number[], atu8_buffer: Uint8Array, atu8_tx_key: Uint8Array, xc_type=P2_VALUES.JSON): Promise<Response> {
		if(!await this.supportsTransparentSigning()) {
			return this.sign(a_path, atu8_buffer as Buffer, xc_type);
		}

		return this.signGetChunks(a_path, atu8_buffer as Buffer)
			.then(async(a_chunks) => {
				// send tx encryption key
				const atu8_key = concat2(Uint8Array.from([32]), atu8_tx_key);
				let g_out = await send_chunk(this.transport as Transport, xc_type, atu8_key, false);

				if(g_out.return_code !== ERROR_CODE.NoError) return g_out;

				// send data
				for(let i_chunk=0; i_chunk<a_chunks.length; i_chunk++) {
					g_out = await send_chunk(this.transport as Transport, xc_type, atu8_key, i_chunk === a_chunks.length - 1);

					if(g_out.return_code !== ERROR_CODE.NoError) return g_out;
				}

				return g_out;
			}, processErrorResponse);
	}
}
