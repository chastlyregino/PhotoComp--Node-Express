var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var _this = this;
var express = require('express');
//const orgService = require(`../service/orgService.js`);
var router = express.Router();
router.get('/', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var org;
    return __generator(this, function (_a) {
      org = req.body;
      if (org) {
        res.status(200).json({ message: 'Here are your organizations!', org: org });
      } else {
        res.status(204).json({ message: 'No organizations found!' });
      }
      return [2 /*return*/];
    });
  });
});
router.post('/', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var org;
    return __generator(this, function (_a) {
      org = req.body;
      if (org) {
        res
          .status(201)
          .json({ message: 'Created organization! '.concat(JSON.stringify(req.body)) });
      } else {
        res.status(400).json({ message: 'Organization not created', org: req.body });
      }
      return [2 /*return*/];
    });
  });
});
router.patch('/', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var org, updatedOrg;
    return __generator(this, function (_a) {
      org = req.body; // update with getOrg()
      if (org) {
        updatedOrg = org; // update with updateOrgName()
        if (updatedOrg) {
          res.status(200).json({ message: 'Organization updated!', org: updatedOrg });
        } else {
          res.status(200).json({ message: 'Organization not updated!' });
        }
      } else {
        res.status(400).json({ message: 'Organization not found!' });
      }
      return [2 /*return*/];
    });
  });
}); //update the name of the org
router.get('/members', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var members;
    return __generator(this, function (_a) {
      members = req.body; //update with getMembers
      if (members) {
        res.status(200).json({ message: 'Org Members!', orgMembers: members });
      } else {
        res.status(400).json({ message: 'No members found!' });
      }
      return [2 /*return*/];
    });
  });
});
router.post('/members', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var member;
    return __generator(this, function (_a) {
      member = req.body; //update with updateMemberStatus()
      if (member) {
        res.status(201).json({ message: 'Member status updated!', orgMember: member });
      } else {
        res.status(400).json({ message: 'Failed to update member status!' });
      }
      return [2 /*return*/];
    });
  });
});
router.delete('/members', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var members, member;
    return __generator(this, function (_a) {
      members = req.body; //update with getMembers
      if (members) {
        member = members; // update with .getMember
        if (member) {
          res.status(200).json({ message: 'Member deleted!', orgMember: req.body });
        } else {
          res.status(400).json({ message: 'No member found!' });
        }
      } else {
        res.status(400).json({ message: 'No members found!' });
      }
      return [2 /*return*/];
    });
  });
});
router.patch('/members', function (req, res) {
  return __awaiter(_this, void 0, void 0, function () {
    var members, member, updatedMember;
    return __generator(this, function (_a) {
      members = req.body; //update with getMembers
      if (members) {
        member = members; // update with .getMember
        if (member) {
          updatedMember = member; // update with .updateMemberRole()
          if (updatedMember) {
            res.status(200).json({ message: 'Member role updated!', orgMember: req.body });
          }
          res.status(400).json({ message: 'Failed to  update Member role!' });
        } else {
          res.status(400).json({ message: 'No member found!' });
        }
      } else {
        res.status(400).json({ message: 'No members found!' });
      }
      return [2 /*return*/];
    });
  });
});
module.exports = router;
