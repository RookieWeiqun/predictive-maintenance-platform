using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Equipment
{
    public int Equipid { get; set; }

    public int? Companyid { get; set; }

    public string? Factory { get; set; }

    public string? Workshop { get; set; }

    public string? Equipmentname { get; set; }

    public string? Productcategory { get; set; }

    public string? Productgroup { get; set; }

    public int? Number { get; set; }
}
