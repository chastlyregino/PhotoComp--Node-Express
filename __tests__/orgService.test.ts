import { OrgService } from '../src/services/orgService';
import { OrgRepository } from '../src/repositories/orgRepository';

jest.mock(`../src/repositories/orgRepository`, () => {
    createOrg: jest.fn();
})
