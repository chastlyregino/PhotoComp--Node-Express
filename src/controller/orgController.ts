const express = require(`express`);
//const orgService = require(`../service/orgService.js`);

const router = express.Router();

router.get(`/`, async (req: any, res: any) => {
  const org = req.body; // change it with getter method

  if (org) {
    res.status(200).json({ message: `Here are your organizations!`, org: org });
  } else {
    res.status(204).json({ message: `No organizations found!` });
  }
});

router.post(`/`, async (req: any, res: any) => {
  const org = req.body; // change it with a setter method

  if (org) {
    res.status(201).json({ message: `Created organization! ${JSON.stringify(req.body)}` });
  } else {
    res.status(400).json({ message: `Organization not created`, org: req.body });
  }
});

router.patch(`/`, async (req: any, res: any) => {
  const org = req.body; // update with getOrg()

  if (org) {
    const updatedOrg = org; // update with updateOrgName()

    if (updatedOrg) {
      res.status(200).json({ message: `Organization updated!`, org: updatedOrg });
    } else {
      res.status(200).json({ message: `Organization not updated!` });
    }
  } else {
    res.status(400).json({ message: `Organization not found!` });
  }
}); //update the name of the org

router.get(`/members`, async (req: any, res: any) => {
  const members = req.body; //update with getMembers

  if (members) {
    res.status(200).json({ message: `Org Members!`, orgMembers: members });
  } else {
    res.status(400).json({ message: `No members found!` });
  }
});

router.post(`/members`, async (req: any, res: any) => {
  const member = req.body; //update with updateMemberStatus()

  if (member) {
    res.status(201).json({ message: `Member status updated!`, orgMember: member });
  } else {
    res.status(400).json({ message: `Failed to update member status!` });
  }
});

router.delete(`/members`, async (req: any, res: any) => {
  const members = req.body; //update with getMembers

  if (members) {
    const member = members; // update with .getMember
    if (member) {
      res.status(200).json({ message: `Member deleted!`, orgMember: req.body });
    } else {
      res.status(400).json({ message: `No member found!` });
    }
  } else {
    res.status(400).json({ message: `No members found!` });
  }
});

router.patch(`/members`, async (req: any, res: any) => {
  const members = req.body; //update with getMembers

  if (members) {
    const member = members; // update with .getMember
    if (member) {
      const updatedMember = member; // update with .updateMemberRole()
      if (updatedMember) {
        res.status(200).json({ message: `Member role updated!`, orgMember: req.body });
      }
      res.status(400).json({ message: `Failed to  update Member role!` });
    } else {
      res.status(400).json({ message: `No member found!` });
    }
  } else {
    res.status(400).json({ message: `No members found!` });
  }
});

module.exports = router;
