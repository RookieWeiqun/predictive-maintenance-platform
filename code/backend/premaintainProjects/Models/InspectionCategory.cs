using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class InspectionCategory
{
    public int Categoryid { get; set; }

    public int? Templateid { get; set; }

    public int? ParentId { get; set; }

    public string? Name { get; set; }

    public int? SortOrder { get; set; }
}
