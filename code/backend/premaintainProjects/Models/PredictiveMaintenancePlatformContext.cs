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

    public virtual DbSet<Company> Companies { get; set; }

    public virtual DbSet<Equipment> Equipments { get; set; }

    public virtual DbSet<InspectionCategory> InspectionCategories { get; set; }

    public virtual DbSet<InspectionItem> InspectionItems { get; set; }

    public virtual DbSet<InspectionTask> InspectionTasks { get; set; }

    public virtual DbSet<InspectionTemplate> InspectionTemplates { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<Taskitem> Taskitems { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) {}

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
            entity.Property(e => e.Completetime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("completetime");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Projectid).HasColumnName("projectid");
            entity.Property(e => e.Status)
                .HasDefaultValue(1)
                .HasComment("1、进行中/2、完成/3、未开始")
                .HasColumnName("status");
            entity.Property(e => e.TaskNo)
                .HasMaxLength(100)
                .HasColumnName("task_no");
            entity.Property(e => e.Templateid).HasColumnName("templateid");
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
            entity.Property(e => e.Managerid).HasColumnName("managerid");
            entity.Property(e => e.Projectname)
                .HasMaxLength(200)
                .HasColumnName("projectname");
            entity.Property(e => e.Projectstatus)
                .HasDefaultValue(1)
                .HasComment("1. 进行中\r\n2. 已完成\r\n3. 已关闭")
                .HasColumnName("projectstatus");
        });

        modelBuilder.Entity<Taskitem>(entity =>
        {
            entity.HasKey(e => e.Itemid).HasName("taskitems_pk");

            entity.ToTable("taskitems");

            entity.HasIndex(e => e.Taskid, "taskitems_taskid_idx");

            entity.Property(e => e.Itemid).HasColumnName("itemid");
            entity.Property(e => e.Categorypath)
                .HasMaxLength(200)
                .HasColumnName("categorypath");
            entity.Property(e => e.Isnormal)
                .HasDefaultValue(true)
                .HasColumnName("isnormal");
            entity.Property(e => e.Isrecheck).HasColumnName("isrecheck");
            entity.Property(e => e.Name)
                .HasMaxLength(200)
                .HasColumnName("name");
            entity.Property(e => e.Photopath)
                .HasMaxLength(200)
                .HasColumnName("photopath");
            entity.Property(e => e.Recheckresult)
                .HasMaxLength(100)
                .HasColumnName("recheckresult");
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
