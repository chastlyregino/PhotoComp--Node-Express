const express = require(`express`);
const orgController = require(`./controller/orgContoller`);

const app = express();
const PORT = 3000;

app.use(express.json());

app.use(`/organizations`, orgController);

app.all(/(.*)/, (req: any, res: any) => {
  res.status(404).json({ message: `Invalid Page!` });
}); // for non-existent pages and methods

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
