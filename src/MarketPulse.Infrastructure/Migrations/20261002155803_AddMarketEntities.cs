using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MarketPulse.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Instruments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AssetClass = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    QuoteCurrency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Instruments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Watchlists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Watchlists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Watchlists_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LatestQuotes",
                columns: table => new
                {
                    InstrumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Bid = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    Ask = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Freshness = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LatestQuotes", x => x.InstrumentId);
                    table.ForeignKey(
                        name: "FK_LatestQuotes_Instruments_InstrumentId",
                        column: x => x.InstrumentId,
                        principalTable: "Instruments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PriceAlerts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstrumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PriceSide = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Direction = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Threshold = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PriceAlerts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PriceAlerts_Instruments_InstrumentId",
                        column: x => x.InstrumentId,
                        principalTable: "Instruments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WatchlistInstruments",
                columns: table => new
                {
                    WatchlistId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstrumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchlistInstruments", x => new { x.WatchlistId, x.InstrumentId });
                    table.ForeignKey(
                        name: "FK_WatchlistInstruments_Instruments_InstrumentId",
                        column: x => x.InstrumentId,
                        principalTable: "Instruments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WatchlistInstruments_Watchlists_WatchlistId",
                        column: x => x.WatchlistId,
                        principalTable: "Watchlists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlertEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PriceAlertId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObservedPrice = table.Column<decimal>(type: "numeric(18,8)", precision: 18, scale: 8, nullable: false),
                    TriggeredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlertEvents_PriceAlerts_PriceAlertId",
                        column: x => x.PriceAlertId,
                        principalTable: "PriceAlerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AlertEventId = table.Column<Guid>(type: "uuid", nullable: false),
                    Channel = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    SentAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveries_AlertEvents_AlertEventId",
                        column: x => x.AlertEventId,
                        principalTable: "AlertEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlertEvents_PriceAlertId",
                table: "AlertEvents",
                column: "PriceAlertId");

            migrationBuilder.CreateIndex(
                name: "IX_Instruments_Symbol",
                table: "Instruments",
                column: "Symbol",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveries_AlertEventId",
                table: "NotificationDeliveries",
                column: "AlertEventId");

            migrationBuilder.CreateIndex(
                name: "IX_PriceAlerts_InstrumentId_IsEnabled",
                table: "PriceAlerts",
                columns: new[] { "InstrumentId", "IsEnabled" });

            migrationBuilder.CreateIndex(
                name: "IX_PriceAlerts_UserId",
                table: "PriceAlerts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchlistInstruments_InstrumentId",
                table: "WatchlistInstruments",
                column: "InstrumentId");

            migrationBuilder.CreateIndex(
                name: "IX_Watchlists_UserId",
                table: "Watchlists",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LatestQuotes");

            migrationBuilder.DropTable(
                name: "NotificationDeliveries");

            migrationBuilder.DropTable(
                name: "WatchlistInstruments");

            migrationBuilder.DropTable(
                name: "AlertEvents");

            migrationBuilder.DropTable(
                name: "Watchlists");

            migrationBuilder.DropTable(
                name: "PriceAlerts");

            migrationBuilder.DropTable(
                name: "Instruments");
        }
    }
}
