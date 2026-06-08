using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using premaintainProjects.Dtos;
using premaintainProjects.Models;
using premaintainProjects.Services;
using Serilog;


var builder = WebApplication.CreateBuilder(args);


var logPath = Path.Combine(AppContext.BaseDirectory, "Logs");
Directory.CreateDirectory(logPath);


/*
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.File(Path.Combine(logPath, "log-.txt"), rollingInterval: RollingInterval.Day)
    .CreateLogger();
*/

// Serilog 落文件
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .WriteTo.File(
        Path.Combine(logPath, "log-.txt"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        shared: true,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

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
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<ServiceTools>();
builder.Services.AddHttpClient();
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
