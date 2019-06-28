import * as API from '../API';
import * as _ from 'lodash';
import { Test } from './Test';
import { ILogger } from './Logger';
import { Property } from './Property';

export class Schema extends Test{
	constructor(protected spec: API.Spec.Schema, logger: ILogger) {
		super(logger);
	}

	test(input: any) {
		let result = true;

		for (let specProp of this.spec.properties) {
			result = result && Property.test(specProp, input[specProp.name], this.logger);
		}

		if (result) {
			this.logger.schemaOK(this.spec);
		} else {
			this.logger.schemaFail(this.spec);
		}

		return result;
	}
}
