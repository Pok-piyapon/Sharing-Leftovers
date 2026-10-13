const reservationService = require("../../services/reservation.service");

exports.myReservations = async (req, res) => {
  const { reservations, page, totalPages } = await reservationService.listMyReservations(req.user.id, req.query);

  const qs = new URLSearchParams(req.query);
  qs.delete("page");
  const qsString = qs.toString();
  const basePath = `/reservations/my?${qsString ? qsString + "&" : ""}page=`;

  res.render("pages/reservations/my", {
    title: "คำขอของฉัน",
    reservations,
    currentPage: page,
    totalPages,
    basePath,
    status: req.query.status || ""
  });
};
