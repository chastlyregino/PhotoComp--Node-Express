jest.mock(`../src/repositories/orgRepository`, () => {
    createOrg: jest.fn();
    createUserAdmin: jest.fn();
    findOrgByName: jest.fn();
});

import { OrgService } from '../src/services/orgService';
import { OrgRepository } from '../src/repositories/orgRepository';

const orgService = new OrgService();

describe(`Positive org tests`, () => {
    beforeEach(() => {
        const orgRepository: OrgRepository = new OrgRepository();
        orgRepository.findOrgByName.mockImplementation(() => Promise.resolve());
        orgRepository.findOrgByName.mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test(`Organization created`, async () => {
        expect(await orgService.createOrg()).toEqual();
    });

    test(`UserAdmin created`, async () => {
        expect(await orgService.createUserAdmin()).toEqual();
    });

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
