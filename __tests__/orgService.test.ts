jest.mock(`../src/repositories/orgRepository`, () => {
    createOrg: jest.fn();
    createUserAdmin: jest.fn();
    findOrgByName: jest.fn();
});

import { OrgService } from '../src/services/orgService';
import { OrgRepository } from '../src/repositories/orgRepository';

