using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Emergency112.Api.Data.Migrations;

public partial class AddTrustedContactFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TrustedContactName",
            table: "AspNetUsers",
            type: "TEXT",
            maxLength: 80,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "TrustedContactPhoneNumber",
            table: "AspNetUsers",
            type: "TEXT",
            maxLength: 24,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "TrustedContactName", table: "AspNetUsers");
        migrationBuilder.DropColumn(name: "TrustedContactPhoneNumber", table: "AspNetUsers");
    }
}
