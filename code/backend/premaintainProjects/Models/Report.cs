using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Report
{
    public int Reportid { get; set; }

    public string Path { get; set; } = null!;

    public int Projectid { get; set; }

    public DateOnly Createdate { get; set; }
}
