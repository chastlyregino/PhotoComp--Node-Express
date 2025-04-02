import { addOrganizationAdmin, createOrganization } from '../src/models/Organizations';
import {
    nonExistingOrg,
    userId,
    org,
    existingOrg,
    createdOrg,
    createdUserAdmin,
} from './utils/orgService-test-data';
import { OrgRepository } from '../src/repositories/orgRepository';
import { OrgService } from '../src/services/orgService';

// Move mocks to the top level
jest.mock(`../src/repositories/orgRepository`);
jest.mock(`../src/models/Organizations`, () => ({
    createOrganization: jest.fn(),
    addOrganizationAdmin: jest.fn(),
}));

describe(`Positive org tests`, () => {
    // Initialize the repository variable before using it
    let orgRepository: any;

    beforeEach(() => {
        // Create a new instance of OrgRepository
        orgRepository = new OrgRepository();

        // Set up the spies after repository is initialized
        jest.spyOn(orgRepository, 'findOrgByName').mockResolvedValue(nonExistingOrg);
        jest.spyOn(orgRepository, 'createOrg').mockResolvedValue(createdOrg);
        jest.spyOn(orgRepository, 'createUserAdmin').mockResolvedValue(createdUserAdmin);

        // Mock models function
        (createOrganization as jest.Mock).mockReturnValue(createdOrg);
        (addOrganizationAdmin as jest.Mock).mockReturnValue(createdUserAdmin);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Organization created`, async () => {
        const orgServiceWithMock = new OrgService(orgRepository);
        const result = await orgServiceWithMock.createOrg(org, userId);

        expect(orgRepository.findOrgByName).toHaveBeenCalled();
        expect(orgRepository.createOrg).toHaveBeenCalled();
        expect(result).toBe(org);
    });

    test(`UserAdmin created`, async () => {
        const orgServiceWithMock = new OrgService(orgRepository);
        const result = await orgServiceWithMock.createUserAdmin(org.name, userId);

        expect(orgRepository.createUserAdmin).toHaveBeenCalled();
        expect(result).toBe(createdUserAdmin);
    });
});

describe(`Negative org tests`, () => {
    // Initialize the repository variable before using it
    let orgRepository: any;

    beforeEach(() => {
        // Create a new instance of OrgRepository
        orgRepository = new OrgRepository();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Organization with the same name`, async () => {
        jest.spyOn(orgRepository, 'findOrgByName').mockResolvedValue(existingOrg);
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(
            `Organization name already in use!`
        );
    });

    test(`Organization without name`, async () => {
        org.name = ``;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(
            `Name and logoUrl are required`
        );
    });

    test(`Organization with invalid logo`, async () => {
        org.logoUrl = `invalid logo`;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(`Invalid URL`);
    });
});
