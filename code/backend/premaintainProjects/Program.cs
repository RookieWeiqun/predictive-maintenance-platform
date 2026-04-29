using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using premaintainProjects.Dtos;
using premaintainProjects.Models;
using premaintainProjects.Services;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCors", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<PredictiveMaintenancePlatformContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ServiceTools>();
var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

var attachPath = Path.Combine(app.Environment.ContentRootPath, "Attach");
Directory.CreateDirectory(attachPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(attachPath),
    RequestPath = "/Attach"
});

app.UseCors("DefaultCors");
app.UseAuthorization();
app.MapControllers();
app.Run();
