using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emergency112.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResponseUnitCodeUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ResponseUnits_Code",
                table: "ResponseUnits",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ResponseUnits_Code",
                table: "ResponseUnits");
        }
    }
}
