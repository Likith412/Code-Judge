import client from "./client";

const data = (response) => response.data;
const listUsers = (params) => client.get("/admin/users", { params }).then(data);
const updateUser = (id, body) =>
   client.patch(`/admin/users/${id}`, body).then(data);

const forceLogout = (id) => client.post(`/admin/users/${id}/logout`).then(data);
const listAudit = (params) => client.get("/admin/audit", { params }).then(data);

export { listUsers, updateUser, forceLogout, listAudit };
