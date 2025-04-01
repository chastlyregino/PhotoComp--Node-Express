import {
    Organization,
    OrganizationCreateRequest,
    UserOrganizationRelationship,
    addOrganizationAdmin,
    createOrganization,
    createOrganizationMembershipRequest,
} from '../src/models/Organizations';
import { UserRole } from '../src/models/User';
import { OrgRepository } from '../src/repositories/orgRepository';
import { OrgService } from '../src/services/orgService';

const orgService = new OrgService();

const nonExistingOrg: null = null;

const userId: string = `81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70`;

const org: OrganizationCreateRequest = {
    name: `Jollibee`,
    logoUrl: `https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8`,
};

const existingOrg: Organization = {
    joinedAt: '2025-04-01T13:28:12.857Z',
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    createdAt: '2025-04-01T13:28:12.857Z',
    GSI1SK: 'ORG#PIZZA',
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    name: 'Pizza',
    GSI1PK: 'PIZ',
    updatedAt: '2025-04-01T13:28:12.857Z',
    SK: 'ENTITY',
    isPublic: true,
    PK: 'ORG#PIZZA',
    id: '4353a165-adbf-43e8-8922-1da90a62a12a',
    type: 'ORGANIZATION',
};

const createdOrg: Organization = {
    PK: 'ORG#JOLLIBEE',
    SK: 'ENTITY',
    id: 'b58bfbd2-7055-4134-aa74-304ae42bf8a8',
    name: 'Jollibee',
    description: undefined,
    createdBy: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    createdAt: '2025-04-01T17:26:48.302Z',
    updatedAt: '2025-04-01T17:26:48.302Z',
    type: 'ORGANIZATION',
    joinedAt: '2025-04-01T17:26:48.302Z',
    isPublic: true,
    logoUrl: 'https://images.app.goo.gl/k7Yc6Yb6ebeaB9HB8',
    website: undefined,
    contactEmail: undefined,
    GSI1PK: 'JOL',
    GSI1SK: 'ORG#JOLLIBEE',
};

const createdUserAdmin: UserOrganizationRelationship = {
    PK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    SK: 'ORG#JOLLIBEE',
    userId: '81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
    organizationName: 'Jollibee',
    role: UserRole.ADMIN,
    joinedAt: '2025-04-01T17:26:48.364Z',
    type: 'USER_ORG',
    GSI1PK: 'ORG#JOLLIBEE',
    GSI1SK: 'USER#81dfd46b-05ba-4cd0-96d8-7ea2cb0c2c70',
};

jest.mock(`../src/repositories/orgRepository`, () => ({
    createOrg: jest.fn(),
    createUserAdmin: jest.fn(),
    findOrgByName: jest.fn().mockImplementation((mockedOrg) => mockedOrg),
}));

jest.mock(`../src/models/Organizations`, () => ({
    createOrganization: jest.fn(),
    addOrganizationAdmin: jest.fn(),
}));

describe(`Positive org tests`, () => {
    let orgRepository: OrgRepository;
    const spyFindOrg = jest.spyOn(orgRepository, 'findOrgByName');
    const spyCreateOrg = jest.spyOn(orgRepository, 'createOrg');

    beforeEach(() => {
        orgRepository = OrgRepository;
        spyFindOrg.mockResolvedValue(nonExistingOrg);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Organization created`, async () => {
        expect(spyFindOrg).toHaveBeenCalled();
        //expect(spyFindOrg).toBe(nonExistingOrg);

        (createOrganization as jest.Mock).mockResolvedValue(createdOrg);
        expect(createOrganization(org, userId)).toBe(createdOrg);

        spyCreateOrg.mockResolvedValue(createdOrg);

        expect(spyCreateOrg).toHaveBeenCalled();
        //expect(spyCreateOrg).toBe(createdOrg);

        expect(await orgService.createOrg(org, userId)).toBe(createdOrg);
    });

    // test(`UserAdmin created`, async () => {
    //     expect(await orgService.createUserAdmin()).toEqual();
    // });

    // test(`Succesful Ticket creation`, async () => {
    //     const ticket = await ticketService.validateTicketData(truthyTicket)
    //     expect(ticket).toBeTruthy()
    //     expect(ticket).toEqual(truthyTicket)

    //     ticketDAO.createTicket.mockImplementation(() => Promise.resolve())
    //     ticketDAO.createTicket.mockResolvedValue(existingTicket)

    //     expect(await ticketService.createTicket(ticket)).toEqual(existingTicket)
    // })

    // test(`Retrieve previous tickets`, async () => {
    //     ticketDAO.getTicketsByUserID.mockImplementation(() => Promise.resolve())
    //     ticketDAO.getTicketsByUserID.mockResolvedValue(existingTickets)

    //     expect(await ticketService.getTicketsByUserID(truthyTicket.user_id, null)).toEqual(existingTickets)
    // })

    // test(`Retrieve previous tickets by type`, async () => {
    //     ticketDAO.getTicketsByUserID.mockImplementation(() => Promise.resolve())
    //     ticketDAO.getTicketsByUserID.mockResolvedValue(existingTicket)

    //     expect(await ticketService.getTicketsByUserID(truthyTicket.user_id, `food`)).toEqual(existingTicket)
    // })
});
