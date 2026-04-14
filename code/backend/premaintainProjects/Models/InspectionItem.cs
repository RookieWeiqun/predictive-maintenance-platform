using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class InspectionItem
{
    public int Itemid { get; set; }

    public int Templateid { get; set; }

    public int? Categoryid { get; set; }

    public string? Name { get; set; }

    /// <summary>
    /// number
    /// boolean
    /// select
    /// </summary>
    public string? ValueType { get; set; }

    /// <summary>
    /// number_range,select_include, boolean_equal
    /// </summary>
    public string? RuleType { get; set; }

    /// <summary>
    /// number_range: {&quot;min&quot;:340,&quot;max&quot;:400,&quot;unit&quot;:&quot;V&quot;} 
    /// select_include: {&quot;normal_values&quot;:[&quot;清洁&quot;,&quot;轻微污渍&quot;]}
    /// boolean_equal: {&quot;normal_value&quot;:false}
    /// </summary>
    public string? Threshold { get; set; }

    public int SortOrder { get; set; }

    /// <summary>
    /// High
    /// Medium
    /// Low
    /// Critical
    /// </summary>
    public string? Priority { get; set; }
}
