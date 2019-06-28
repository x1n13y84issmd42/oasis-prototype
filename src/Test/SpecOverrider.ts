import * as API from '../API';
import { ILogger } from './Logger';

type Partial<T> = {
    [P in keyof T]?: T[P];
}

export type SecurityOverride = Partial<API.Spec.Security>;

export type Override = {
	security?: SecurityOverride
};

export class SpecOverrider {
	constructor(protected over: Override = {}, protected logger: ILogger) {

	}

	protected override(what: string, base, over) {
		for (let oK in over) {
			base[oK] = over[oK];
			this.logger.overriding(`${what}.${oK} with "${over[oK]}"`);
		}
	}

	security(sec: API.Spec.Security) {
		if (this.over.security) {
			this.override('Security', sec, this.over.security);
		}
	}
}
