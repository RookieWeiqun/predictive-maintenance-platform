using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace premaintainProjects.Models;

public partial class PredictiveMaintenancePlatformContext : DbContext
{
    public PredictiveMaintenancePlatformContext()
    {
    }

    public PredictiveMaintenancePlatformContext(DbContextOptions<PredictiveMaintenancePlatformContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Attachment> Attachments { get; set; }

    public virtual DbSet<Company> Companies { get; set; }

    public virtual DbSet<Equipment> Equipments { get; set; }

    public virtual DbSet<InspectionCategory> InspectionCategories { get; set; }

    public virtual DbSet<InspectionItem> InspectionItems { get; set; }

    public virtual DbSet<InspectionTask> InspectionTasks { get; set; }

    public virtual DbSet<InspectionTemplate> InspectionTemplates { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<ProjectEquipment> ProjectEquipments { get; set; }

    public virtual DbSet<Report> Reports { get; set; }

    public virtual DbSet<Taskitem> Taskitems { get; set; }

    public virtual DbSet<TaskitemsBackup2025> TaskitemsBackup2025s { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=36.110.89.30;Port=54321;Database=PredictiveMaintenancePlatform;Username=PredictiveMaintenance;Password=PsmDig@2026");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Attachment>(entity =>
        {
            entity.HasKey(e => e.Attaid).HasName("attachment_pk");

            entity.ToTable("attachment");

            entity.Property(e => e.Attaid)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("attaid");
            entity.Property(e => e.Filepath)
                .HasColumnType("character varying")
                .HasColumnName("filepath");
            entity.Property(e => e.Taskitemid).HasColumnName("taskitemid");
        });

        modelBuilder.Entity<Company>(entity =>
        {
            entity.HasKey(e => e.Companyid).HasName("companies_pkey");

            entity.ToTable("companies");

            entity.HasIndex(e => e.CreditCode, "companies_unique").IsUnique();

            entity.Property(e => e.Companyid).HasColumnName("companyid");
            entity.Property(e => e.Companyname)
                .HasMaxLength(100)
                .HasColumnName("companyname");
            entity.Property(e => e.CreditCode)
                .HasMaxLength(100)
                .HasComment("统一信用代码")
                .HasColumnName("credit_code");
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.Equipid).HasName("equipments_pkey");

            entity.ToTable("equipments");

            entity.HasIndex(e => e.Companyid, "equipments_companyid_idx");

            entity.Property(e => e.Equipid).HasColumnName("equipid");
            entity.Property(e => e.Companyid).HasColumnName("companyid");
            entity.Property(e => e.Equipmentname)
                .HasMaxLength(100)
                .HasColumnName("equipmentname");
            entity.Property(e => e.Factory)
                .HasMaxLength(100)
                .HasColumnName("factory");
            entity.Property(e => e.Mlfb)
                .HasMaxLength(50)
                .HasColumnName("mlfb");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.Productcategory)
                .HasMaxLength(100)
                .HasColumnName("productcategory");
            entity.Property(e => e.Productgroup)
                .HasMaxLength(100)
                .HasColumnName("productgroup");
            entity.Property(e => e.Workshop)
                .HasMaxLength(100)
                .HasColumnName("workshop");
        });

        modelBuilder.Entity<InspectionCategory>(entity =>
        {
            entity.HasKey(e => e.Categoryid).HasName("inspection_category_pkey");

            entity.ToTable("inspection_category");

            entity.HasIndex(e => new { e.Templateid, e.ParentId, e.SortOrder }, "inspection_category_templateid_idx");

            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.SortOrder)
                .HasDefaultValue(1)
                .HasColumnName("sort_order");
            entity.Property(e => e.Templateid).HasColumnName("templateid");
        });

        modelBuilder.Entity<InspectionItem>(entity =>
        {
            entity.HasKey(e => e.Itemid).HasName("inspection_item_pkey");

            entity.ToTable("inspection_items");

            entity.HasIndex(e => new { e.Templateid, e.Categoryid, e.SortOrder }, "inspection_items_templateid_idx");

            entity.Property(e => e.Itemid).HasColumnName("itemid");
            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Priority)
                .HasMaxLength(20)
                .HasComment("High\r\nMedium\r\nLow\r\nCritical")
                .HasColumnName("priority");
            entity.Property(e => e.RuleType)
                .HasMaxLength(50)
                .HasDefaultValueSql("'number_range'::character varying")
                .HasComment("number_range,select_include, boolean_equal")
                .HasColumnName("rule_type");
            entity.Property(e => e.SortOrder)
                .HasDefaultValue(1)
                .HasColumnName("sort_order");
            entity.Property(e => e.Templateid).HasColumnName("templateid");
            entity.Property(e => e.Threshold)
                .HasComment("number_range: {\"min\":340,\"max\":400,\"unit\":\"V\"} \r\nselect_include: {\"normal_values\":[\"清洁\",\"轻微污渍\"]}\r\nboolean_equal: {\"normal_value\":false}")
                .HasColumnType("jsonb")
                .HasColumnName("threshold");
            entity.Property(e => e.ValueType)
                .HasMaxLength(50)
                .HasDefaultValueSql("'number'::character varying")
                .HasComment("number\r\nboolean\r\nselect")
                .HasColumnName("value_type");
        });

        modelBuilder.Entity<InspectionTask>(entity =>
        {
            entity.HasKey(e => e.Taskid).HasName("inspection_tasks_pkey");

            entity.ToTable("inspection_tasks");

            entity.HasIndex(e => e.Assigneduserid, "inspection_tasks_assigneduserid_idx");

            entity.HasIndex(e => new { e.Projectid, e.Templateid, e.Productid }, "inspection_tasks_projectid_idx");

            entity.Property(e => e.Taskid).HasColumnName("taskid");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Assignedusername)
                .HasColumnType("character varying")
                .HasColumnName("assignedusername");
            entity.Property(e => e.DownloadDeviceName)
                .HasColumnType("character varying")
                .HasColumnName("download_device_name");
            entity.Property(e => e.DownloadedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("downloaded_at");
            entity.Property(e => e.Ifdel).HasColumnName("ifdel");
            entity.Property(e => e.Inspectiontype)
                .HasDefaultValue(1)
                .HasComment("1、设备检测\r\n2、外围检测")
                .HasColumnName("inspectiontype");
            entity.Property(e => e.LocalUpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("local_updated_at");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Projectid).HasColumnName("projectid");
            entity.Property(e => e.Serialno)
                .HasColumnType("character varying")
                .HasColumnName("serialno");
            entity.Property(e => e.Status)
                .HasDefaultValue(1)
                .HasComment("1、进行中/2、完成/3、未开始")
                .HasColumnName("status");
            entity.Property(e => e.TaskNo)
                .HasMaxLength(100)
                .HasColumnName("task_no");
            entity.Property(e => e.Templateid).HasColumnName("templateid");
            entity.Property(e => e.Version).HasColumnName("version");
        });

        modelBuilder.Entity<InspectionTemplate>(entity =>
        {
            entity.HasKey(e => e.Templateid).HasName("inspection_template_pkey");

            entity.ToTable("inspection_template", tb => tb.HasComment("外围和设备检测的模板"));

            entity.HasIndex(e => new { e.Mlfb, e.Inspectiontype }, "inspection_template_mlfb_idx");

            entity.HasIndex(e => new { e.Productcategory, e.Inspectiontype }, "inspection_template_productcategory_idx");

            entity.Property(e => e.Templateid).HasColumnName("templateid");
            entity.Property(e => e.Createdate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("createdate");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.Inspectiontype)
                .HasDefaultValue(1)
                .HasComment("1、设备检测\r\n2、外围检测")
                .HasColumnName("inspectiontype");
            entity.Property(e => e.Mlfb)
                .HasMaxLength(100)
                .HasColumnName("mlfb");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Productcategory)
                .HasMaxLength(100)
                .HasColumnName("productcategory");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Productid).HasName("products_pkey");

            entity.ToTable("products");

            entity.HasIndex(e => e.Equipid, "products_equipid_idx");

            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Equipid).HasColumnName("equipid");
            entity.Property(e => e.Mlfb)
                .HasMaxLength(100)
                .HasColumnName("mlfb");
            entity.Property(e => e.Serialno)
                .HasMaxLength(100)
                .HasColumnName("serialno");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Projectid).HasName("projects_pk");

            entity.ToTable("projects");

            entity.HasIndex(e => e.Companyid, "projects_companyid_idx");

            entity.Property(e => e.Projectid).HasColumnName("projectid");
            entity.Property(e => e.Assigneduserid).HasColumnName("assigneduserid");
            entity.Property(e => e.Companyid).HasColumnName("companyid");
            entity.Property(e => e.Createdate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("createdate");
            entity.Property(e => e.Ifdel).HasColumnName("ifdel");
            entity.Property(e => e.Managerid).HasColumnName("managerid");
            entity.Property(e => e.Projectname)
                .HasMaxLength(200)
                .HasColumnName("projectname");
            entity.Property(e => e.Projectstatus)
                .HasDefaultValue(1)
                .HasComment("1. 进行中\r\n2. 已完成\r\n3. 已关闭")
                .HasColumnName("projectstatus");
        });

        modelBuilder.Entity<ProjectEquipment>(entity =>
        {
            entity.HasKey(e => e.Peid).HasName("projectequips_pk");

            entity.ToTable("project_equipments");

            entity.HasIndex(e => e.Projectid, "project_equipments_projectid_idx");

            entity.Property(e => e.Peid).HasColumnName("peid");
            entity.Property(e => e.Equipmentid).HasColumnName("equipmentid");
            entity.Property(e => e.Ifdel).HasColumnName("ifdel");
            entity.Property(e => e.Projectid).HasColumnName("projectid");
            entity.Property(e => e.Templateid).HasColumnName("templateid");
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Reportid).HasName("reports_pk");

            entity.ToTable("reports");

            entity.HasIndex(e => e.Projectid, "reports_projectid_idx").IsUnique();

            entity.Property(e => e.Reportid).HasColumnName("reportid");
            entity.Property(e => e.Createdate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("createdate");
            entity.Property(e => e.Ifdel).HasColumnName("ifdel");
            entity.Property(e => e.Path)
                .HasMaxLength(200)
                .HasColumnName("path");
            entity.Property(e => e.Projectid).HasColumnName("projectid");
        });

        modelBuilder.Entity<Taskitem>(entity =>
        {
            entity.HasKey(e => e.Itemid).HasName("taskitems_pk");

            entity.ToTable("taskitems");

            entity.HasIndex(e => e.Taskid, "taskitems_taskid_idx");

            entity.Property(e => e.Itemid)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("itemid");
            entity.Property(e => e.Categorypath)
                .HasMaxLength(200)
                .HasColumnName("categorypath");
            entity.Property(e => e.Createtime)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createtime");
            entity.Property(e => e.ExecutionStatus)
                .HasDefaultValue((short)1)
                .HasComment("1.pending 待执行。任务包刚下发或尚未填写结果时使用。\r\n2.\r\ncompleted 已执行并已填写结果。\r\n\r\n3.skipped 本次现场决定跳过该项，但该项原本是计划中的标准检查项。\r\n4. not_applicable 该项对当前设备或现场不适用。\r\n5.\r\nrecheck_required 已执行，但需要后续复检或二次确认。")
                .HasColumnName("execution_status");
            entity.Property(e => e.Inspectionitemid).HasColumnName("inspectionitemid");
            entity.Property(e => e.Isnormal)
                .HasDefaultValue(true)
                .HasColumnName("isnormal");
            entity.Property(e => e.Isrecheck).HasColumnName("isrecheck");
            entity.Property(e => e.RenderSchemaJson)
                .HasColumnType("jsonb")
                .HasColumnName("render_schema_json");
            entity.Property(e => e.SourceType)
                .HasDefaultValue((short)1)
                .HasComment("1. system_generated\r\n2.manual_added")
                .HasColumnName("source_type");
            entity.Property(e => e.Taskid).HasColumnName("taskid");
            entity.Property(e => e.Taskname)
                .HasMaxLength(200)
                .HasColumnName("taskname");
            entity.Property(e => e.Taskresult)
                .HasColumnType("jsonb")
                .HasColumnName("taskresult");
            entity.Property(e => e.Updatetime)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updatetime");
        });

        modelBuilder.Entity<TaskitemsBackup2025>(entity =>
        {
            entity
                .HasNoKey()
                .ToTable("taskitems_backup_2025");

            entity.Property(e => e.Categorypath)
                .HasMaxLength(200)
                .HasColumnName("categorypath");
            entity.Property(e => e.Createtime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("createtime");
            entity.Property(e => e.Isnormal).HasColumnName("isnormal");
            entity.Property(e => e.Isrecheck).HasColumnName("isrecheck");
            entity.Property(e => e.Itemid).HasColumnName("itemid");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.Photopath)
                .HasMaxLength(200)
                .HasColumnName("photopath");
            entity.Property(e => e.Result)
                .HasColumnType("character varying")
                .HasColumnName("result");
            entity.Property(e => e.Taskid).HasColumnName("taskid");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Userid).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Mobile, "users_mobile_idx");

            entity.Property(e => e.Userid).HasColumnName("userid");
            entity.Property(e => e.Companyid).HasColumnName("companyid");
            entity.Property(e => e.Createdate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("createdate");
            entity.Property(e => e.Industry)
                .HasMaxLength(100)
                .HasColumnName("industry");
            entity.Property(e => e.Mobile)
                .HasMaxLength(50)
                .HasColumnName("mobile");
            entity.Property(e => e.Role).HasColumnName("role");
            entity.Property(e => e.Username)
                .HasMaxLength(100)
                .HasColumnName("username");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
