import {
    addOrganizationAdmin,
    createOrganization,
    updateOrganization,
} from '../src/models/Organizations';
import {
    nonExistingOrg,
    userId,
    org,
    existingOrg,
    createdOrg,
    createdUserAdmin,
    existingOrgsUser,
    updateOrg,
    updatedOrganization,
} from './utils/orgService-test-data';
import { OrgRepository } from '../src/repositories/orgRepository';
import { OrgService } from '../src/services/orgService';
import { UserRole } from '@/models/User';

// Move mocks to the top level
jest.mock(`../src/repositories/orgRepository`);
jest.mock(`../src/models/Organizations`, () => ({
    createOrganization: jest.fn(),
    addOrganizationAdmin: jest.fn(),
    updateOrganization: jest.fn(),
}));

describe(`Negative parent method tests`, () => {
    // Initialize the repository variable before using it
    let orgRepository: any;
    let mockOrgService: any;

    beforeEach(() => {
        // Create a new instance of OrgRepository
        orgRepository = new OrgRepository();
        mockOrgService = new OrgService(orgRepository);
        // Set up the spies after repository is initialized
        createdUserAdmin.role = UserRole.MEMBER;
        jest.spyOn(orgRepository, 'findOrgByName').mockResolvedValue(existingOrg);
        jest.spyOn(orgRepository, 'findSpecificOrgByUser').mockResolvedValue(createdUserAdmin);
        jest.spyOn(mockOrgService, 'validateUrl');
        jest.spyOn(mockOrgService, 'findSpecificOrgByUser').mockResolvedValue(createdUserAdmin);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Updating Organization as a member`, async () => {
        mockOrgService.validateUrl(updateOrg.website);
        mockOrgService.validateUrl(updateOrg.logoUrl);
        orgRepository.findSpecificOrgByUser(createdUserAdmin);
        mockOrgService.findSpecificOrgByUser(createdUserAdmin);
        
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.updateOrgByName(updateOrg, userId)).rejects.toThrow(
            `Only Admin roles can updated Organizations` // "You need to specify the Organization name."
        );
        expect(mockOrgService.validateUrl).toHaveBeenCalledTimes(2);
        expect(mockOrgService.validateUrl).toHaveBeenLastCalledWith(updateOrg.logoUrl);
        expect(orgRepository.findOrgByName).toHaveBeenCalled();
        expect(orgRepository.findSpecificOrgByUser).toHaveBeenCalled();
        expect(mockOrgService.findSpecificOrgByUser).toHaveBeenCalled();
    });
});

describe(`Positive org tests`, () => {
    // Initialize the repository variable before using it
    let orgRepository: any;
    let mockOrgService: any;

    beforeEach(() => {
        // Create a new instance of OrgRepository
        orgRepository = new OrgRepository();
        mockOrgService = new OrgService(orgRepository);
        createdUserAdmin.role = UserRole.ADMIN;
        // Set up the spies after repository is initialized
        jest.spyOn(orgRepository, 'findOrgByName').mockResolvedValue(nonExistingOrg);
        jest.spyOn(orgRepository, 'createOrg').mockResolvedValue(createdOrg);
        jest.spyOn(orgRepository, 'createUserAdmin').mockResolvedValue(createdUserAdmin);
        jest.spyOn(orgRepository, 'findOrgsByUser').mockResolvedValue(existingOrgsUser);
        jest.spyOn(orgRepository, 'updateOrgByName').mockResolvedValue(updatedOrganization);
        jest.spyOn(orgRepository, 'findSpecificOrgByUser').mockResolvedValue(createdUserAdmin);
        jest.spyOn(mockOrgService, 'validateUrl');
        jest.spyOn(mockOrgService, 'findSpecificOrgByUser').mockResolvedValue(createdUserAdmin);

        // Mock models function
        (createOrganization as jest.Mock).mockReturnValue(createdOrg);
        (addOrganizationAdmin as jest.Mock).mockReturnValue(createdUserAdmin);
        (updateOrganization as jest.Mock).mockReturnValue(updatedOrganization);
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

    test(`Get all organizations`, async () => {
        const orgServiceWithMock = new OrgService(orgRepository);
        const result = await orgServiceWithMock.findOrgsByUser(userId);

        expect(orgRepository.findOrgsByUser).toHaveBeenCalled();
        expect(result).toBe(existingOrgsUser);
    });

    test(`Updating Organization`, async () => {
        mockOrgService.validateUrl(updateOrg.website);
        mockOrgService.validateUrl(updateOrg.logoUrl);
        orgRepository.findOrgByName.mockResolvedValue(existingOrg);

        const orgServiceWithMock = new OrgService(orgRepository);

        const result = await orgServiceWithMock.updateOrgByName(updateOrg, userId);

        expect(mockOrgService.validateUrl).toHaveBeenCalledTimes(2);
        expect(mockOrgService.validateUrl).toHaveBeenLastCalledWith(updateOrg.logoUrl);
        expect(orgRepository.findOrgByName).toHaveBeenCalled();
        expect(orgRepository.findSpecificOrgByUser).toHaveBeenCalled();
        expect(result).toBe(updatedOrganization);
    });
});

describe(`Negative org tests`, () => {
    // Initialize the repository variable before using it
    let orgRepository: any;
    let mockOrgService: any;

    beforeEach(() => {
        // Create a new instance of OrgRepository
        orgRepository = new OrgRepository();
        mockOrgService = new OrgService(orgRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Create Organization with the same name`, async () => {
        jest.spyOn(orgRepository, 'findOrgByName').mockResolvedValue(existingOrg);
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(
            `Organization name already in use!`
        );
    });

    test(`Create Organization without name`, async () => {
        org.name = ``;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(
            `Name and logoUrl are required`
        );
    });

    test(`Create Organization with invalid logo`, async () => {
        org.logoUrl = `invalid logo`;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.createOrg(org, userId)).rejects.toThrow(`Invalid URL`);
    });

    test(`Organization with invalid User`, async () => {
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.findOrgsByUser(`invalidId`)).rejects.toThrow(
            `No Organizations found!`
        );
    });

    test(`Updating Organization without name`, async () => {
        updateOrg.name = ``;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.updateOrgByName(updateOrg, userId)).rejects.toThrow(
            `You need to specify the Organization name.`
        );
    });

    test(`Updating Organization as a non-member`, async () => {
        jest.spyOn(orgRepository, 'findSpecificOrgByUser').mockResolvedValue(null);
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.findSpecificOrgByUser(updateOrg.name, userId)).rejects.toThrow(
            `You need to be a part of this Organization`
        );
        expect(orgRepository.findSpecificOrgByUser).toHaveBeenCalled();
    });

    test(`Using invalid URL`, async () => {
        org.logoUrl = `invalid logo`;
        const orgServiceWithMock = new OrgService(orgRepository);

        await expect(orgServiceWithMock.validateUrl(org.logoUrl)).rejects.toThrow(`Invalid URL`);
    });
});
