import * as API from '../API';
import { Test } from './Test';
import { ILogger } from './Logger';
import * as _ from 'lodash';
import { Data } from './Data';

export class Property {
	static test(prop: API.Spec.Property, input, logger: ILogger): boolean {
		let typeTest = Data.getTypeTester(prop.type);

		if (! typeTest) {
			throw new Error(`Could not determine the correct type tester for the '${prop.name}' property.`);
		}

		let hasValue = input != undefined;
		let requiredOK = (prop.required && hasValue) || !prop.required;
		let typeOK = (hasValue && typeTest(input)) || !hasValue;

		if (! requiredOK) {
			logger.propertyHasNoValue(prop);
		}

		if (! typeOK) {
			logger.propertyHasWrongType(prop);
		}

		return requiredOK && typeOK;
	}
}
