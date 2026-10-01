import { factory } from "../env.js";

export const governorateRoutes = factory.createApp()
  .get("/governorates", async (c) => {
    const rows = await c.var.sql.all<{ id: string; name: string }>(
      "SELECT id, name FROM governorates ORDER BY sort_order, name",
    );
    return c.json(rows);
  })
  .get("/governorates/:id/delegations", async (c) => {
    const rows = await c.var.sql.all<{ id: string; name: string; governorate_id: string }>(
      "SELECT id, name, governorate_id FROM delegations WHERE governorate_id = ? ORDER BY name",
      [c.req.param("id")],
    );
    return c.json(rows.map((row) => ({ id: row.id, name: row.name, governorateId: row.governorate_id })));
  });
